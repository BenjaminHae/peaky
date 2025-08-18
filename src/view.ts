import GeoLocation from './geoLocation';

const MAGIC_MAX_HEIGHT = 8850; //mount everest 
const MAGIC_RIDGE_PASS_DISTANCE = 15;

class DirectionalView {
   ridges: ElevatedPoint[];
   central_location_elevation: number;
   highest_elevation: number;
   // rise per meter from the elevation of the central location to the point of highest elevation so far
   highest_elevation_rise: number;
   candidate: RidgeCandidatePoint;
   possible: boolean;

   constructor(central_location_elevation: number) {
     this.ridges = []
     this.highest_elevation = 0
     this.highest_elevation_rise = -1000
     this.central_location_elevation = central_location_elevation
     this.possible = true;
   }

   //distance and elevation in meters
   add_possible_ridge_point(location, elevation, distance, pass: number): void {
     if ((this.central_location_elevation + this.highest_elevation_rise * distance) < elevation) {
       this.highest_elevation = elevation;
       this.highest_elevation_rise = (elevation - this.central_location_elevation) / distance;
       // if there is a valley behind the last candidate, the last candidate was indeed a RidgePoint
       if (this.candidate && (pass - this.candidate.pass) > MAGIC_RIDGE_PASS_DISTANCE) {
         this.add_ridge_point(this.candidate.point);
       }
       this.candidate = new RidgeCandidatePoint(new ElevatedPoint(location, elevation, distance), pass)
     }
   }

   check_possibility(distance: number) {
     if (!this.possible) {
       return false;
     }
     if (this.central_location_elevation + this.highest_elevation_rise * distance > MAGIC_MAX_HEIGHT) {
       this.possible = false;
       return false;
     }
     return true;
   }
   add_ridge_point(ridge_point: ElevatedPoint): void {
     this.ridges.push(ridge_point);
     if (ridge_point.elevation > this.highest_elevation) {
       this.highest_elevation = ridge_point.elevation;
     }
   }
   
   capture_last_ridge(pass: number): void {
     if (this.candidate && (pass - this.candidate.pass) > 1) {
       this.add_ridge_point(this.candidate.point);
     }
   }
}

export class ElevatedPoint {
  location: GeoLocation
  elevation: number
  // in meters
  distance_to_central_location: number;
  
  constructor(location: GeoLocation, elevation: number, distance: number) {
    this.location = location;
    this.elevation = elevation;
    this.distance_to_central_location = distance;
  }
}

class RidgeCandidatePoint {
  point: ElevatedPoint;
  pass: number;
  constructor (point, pass) {
    this.point = point;
    this.pass = pass;
  }
}
 

export class RidgePoint{
  point: ElevatedPoint;
  direction: number;
  local_max: boolean;
  
  constructor(point: ElevatedPoint, direction: number) {
    this.point = point;
    this.direction = direction;
    this.local_max = true;
  }
}

// indexed by directions
export type Ridge = Array<RidgePoint>

function delete_from_array(myArray: Array<any>, key: string) {
  const index = myArray.indexOf(key, 0);
  if (index > -1) {
     myArray.splice(index, 1);
  }
}


export default class View {
  // will be multiplied by 4 to separate the circle into sectors
  circle_resolution: number;
  // visibility in m
  visual_range: number;
  directions: DirectionalView[];
  ridges: Ridge[];
  
  data_steps = 30;//when stepping one px in the elevation file we pass 30m, depends on the srtm files in use
  data_source: { get_elevation(lat, lon: number) };
  location: GeoLocation;
  elevation: number;

  constructor(data_source: any, circle_resolution = 360, visual_range = 30000) {
    this.circle_resolution = circle_resolution;
    this.visual_range = visual_range;
    this.data_source = data_source;
  }

  calculate_directional_view(location: GeoLocation, elevation?: number): void {
    this.location = location;
    if(!elevation) {
      this.elevation = Math.max(this.get_elevation(location), 0);
    }
    else {
      this.elevation = elevation;
    }
    this.init_directions()
    const max_pass = (this.visual_range/this.data_steps);
    for (let i = 30; i < max_pass ; i++) {
      this.traverse_one_ring(i);
      if (this.directions.every(d => !d.possible)) {
        break;
      }
    }
    this.finish_directions(max_pass);
    const points: Array<ElevatedPoint> = ([] as Array<ElevatedPoint>).concat(...this.directions.map(d=>d.ridges));
    this.build_ridges(points);
  }

  find_minimum_point_distance(point: ElevatedPoint, points: Array<ElevatedPoint>, min_start: number): number {
    return points.reduce(
        (min, p) => {
          const dist = p.location.distance_to(point.location);
          if (dist < min && dist > 0){
            return dist
          }
          else {
            return min
          }
        }, 
        min_start)
  }

  find_neighbor_for_point(point: ElevatedPoint, points: Array<ElevatedPoint>): ElevatedPoint | null {
    const magic_constant = 10 * 1.4;
    const max_location_diff = (point.distance_to_central_location * Math.PI * 2) * magic_constant / this.circle_resolution;
    let best_fit: ElevatedPoint | null = null;
    let best_fit_distance = max_location_diff;
    for (let new_point of points) {
      const dist = point.location.distance_to(new_point.location);
      if (dist < max_location_diff && dist < best_fit_distance && this.find_minimum_point_distance(new_point, points, dist) >= dist ) {
        best_fit = new_point;
        best_fit_distance = dist;
      }
    }
    if (best_fit) {
      const index = points.indexOf(best_fit, 0);
      if (index > -1) {
         points.splice(index, 1);
      }
    }
    return best_fit;
  } 

  build_ridges(points: Array<ElevatedPoint>) {
    this.ridges = [];
    for (let item of points) {
      const index = points.indexOf(item, 0);
      if (index > -1) {
         points.splice(index, 1);
      }
      let last_point = new RidgePoint(item, this.get_direction(item.location))
      const new_ridge: Array<RidgePoint> = [last_point];
      let next_point = this.find_neighbor_for_point(item, points);
      while (next_point) {
        const new_ridge_point = new RidgePoint(next_point, this.get_direction(next_point.location))
        if (next_point.elevation > last_point.point.elevation) {
          last_point.local_max = false;
        }
        else {
          new_ridge_point.local_max = false;
        }
        new_ridge.push(new_ridge_point);
        last_point = new_ridge_point;
        next_point = this.find_neighbor_for_point(next_point, points);
      }
      if (new_ridge.length > 1) {
        this.ridges.push(new_ridge);
      }
    }
  }

  get_elevation(location: GeoLocation): number {
    return this.data_source.get_elevation(location.lat, location.lon);
  }

  // returns a number between 0 and circle_resolution
  get_direction(location: GeoLocation): number {
    const rad = this.location.direction_to(location)
    let dir = - Math.floor((this.circle_resolution) * rad / (2 * Math.PI) )
    if (dir < 0) {
      dir += (this.circle_resolution);
    }
    return dir;
  }
  
  init_directions(): void {
    this.directions = [];
    for (let i = 0; i < this.circle_resolution; i++) {
      this.directions[i] = new DirectionalView(this.elevation);
    }
  }

  finish_directions(pass): void {
    for (let i = 0; i < this.circle_resolution; i++) {
      this.directions[i].capture_last_ridge(pass);
    }
  }

  check_point(location: GeoLocation, pass: number) {
    const direction = this.get_direction(location);
    const distance = this.location.distance_to(location);
    if (!this.directions[direction].check_possibility(distance)) {
      return;
    }

    const elevation = this.get_elevation(location)
    if (elevation > this.directions[direction].highest_elevation) {
      const new_location = new GeoLocation(location.lat, location.lon)
      this.directions[direction].add_possible_ridge_point(
        new_location, 
        elevation, 
        distance,
        pass
      );
    }
  }

  traverse_one_ring(distance: number): void {
    const location = new GeoLocation(this.location.lat, this.location.lon);
    //go to top left corner
    location.move_lat( (- distance - 1) * this.data_steps);
    location.move_lon( (- distance ) * this.data_steps);
    //move right
    for (let i=0; i<((2*distance -1)+2); i++) {
      location.move_lat(this.data_steps);
      this.check_point(location, distance);
    }
    //move down
    for (let i=0; i<((2*distance -1)+1); i++) {
      location.move_lon(this.data_steps);
      this.check_point(location, distance);
    }
    //move left
    for (let i=0; i<((2*distance -1)+1); i++) {
      location.move_lat(-this.data_steps);
      this.check_point(location, distance);
    }
    //move up
    for (let i=0; i<((2*distance -1)); i++) {
      location.move_lon(-this.data_steps);
      this.check_point(location, distance);
    }
  }

}

