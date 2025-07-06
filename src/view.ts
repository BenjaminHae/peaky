import GeoLocation from './geoLocation';

class DirectionalView {
   ridges: ElevatedPoint[]
   highest_elevation: number;
   candidate: RidgeCandidatePoint;

   constructor(){
     this.ridges = []
     this.highest_elevation = 0
   }

   //distance and elevation in meters
   add_possible_ridge_point(location, elevation, distance, pass: number): void {
     if (elevation > this.highest_elevation) {
       this.highest_elevation = elevation;
       // if there is a valley behind the last candidate, the last candidate was indeed a RidgePoint
       if (this.candidate && (pass - this.candidate.pass) > 1) {
         this.add_ridge_point(this.candidate.point);
       }
       this.candidate = new RidgeCandidatePoint(new ElevatedPoint(location, elevation, distance), pass)
     }
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

class ElevatedPoint {
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
 

class RidgePoint{
  point: ElevatedPoint;
  direction: number;
  
  constructor(point: ElevatedPoint, direction: number) {
    this.point = point;
    this.direction = direction;
  }
}

// indexed by directions
type Ridge = Array<RidgePoint>

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
  
  data_steps = 90;//when stepping one px in the elevation file we pass 90m
  data_source: { get_elevation(lat, lon: number) };
  location: GeoLocation;

  constructor(data_source: any, circle_resolution = 360, visual_range = 30000) {
    this.circle_resolution = circle_resolution;
    this.visual_range = visual_range;
    this.data_source = data_source;
  }

  calculate_directional_view(location: GeoLocation): void {
    this.location = location;
    this.init_directions()
    const max_pass = (this.visual_range/this.data_steps);
    for (let i = 40; i < max_pass ; i++) {
      this.traverse_one_ring(i);
    }
    this.finish_directions(max_pass);
    this.build_ridges();
  }

  find_next_directions_ridge_connector_index(next_direction: number, point: ElevatedPoint): string|null {
    //todo, the acceptable maximum distance must also depend on the distance of the points to the current center location
    const max_height_diff = 100;
    const max_location_diff = 500;
    let best_fit: ElevatedPoint;
    let best_fit_index: string|null = null;
    let best_fit_distance = max_location_diff;
    for (let ridge_point_index in this.directions[next_direction].ridges) {
      const new_point = this.directions[next_direction].ridges[ridge_point_index];
      if (new_point) {
        if (Math.abs(point.elevation - new_point.elevation) < max_height_diff) {
          const dist = point.location.distance_to(new_point.location);
          if (dist < max_location_diff && dist < best_fit_distance) {
            best_fit = new_point;
            best_fit_index = ridge_point_index;
            best_fit_distance = dist;
          }
        }
      }
    }
    return best_fit_index;
  }  

  //todo: connect the dots
  // not strictly necessary at first
  // attention: currently build_ridges deletes points from the directions!
  build_ridges(): void {
    this.ridges = [];
    for (let i = 0; i < (this.circle_resolution - 1); i++) {
      for (let start_ridge_index in this.directions[i].ridges) {
        // starting with a point that does not yet belong to a ridge:
        const ridge_start_point = this.directions[i].ridges[start_ridge_index]; // attention, this point is currently not deleted, even if it is part of a ridge
        if (ridge_start_point) {
          // find a nearby point in the next direction
          let next_index = this.find_next_directions_ridge_connector_index(i+1, ridge_start_point)
          if (next_index) {
            // take this point and delete it from this directions list (so it does not appear in two ridges)
            let next_point = this.directions[i+1].ridges[next_index];
            delete_from_array(this.directions[i+1].ridges, next_index);
            // create the ridge from the first two points
            const new_ridge = [new RidgePoint(ridge_start_point, i), new RidgePoint(next_point, i+1)];
            // now go looking for the next pints
            for (let search_direction = i+2; search_direction < this.circle_resolution; search_direction++) {
              next_index = this.find_next_directions_ridge_connector_index(search_direction, next_point)
              if (next_index) {
                next_point = this.directions[search_direction].ridges[next_index];
                delete_from_array(this.directions[i+1].ridges, next_index);
                new_ridge.push(new RidgePoint(next_point, search_direction));
              } else {
                break;
              }
            }
            
            this.ridges.push(new_ridge);
          }
        }
      }
    }
  }

  //todo implement it!
  get_elevation(location: GeoLocation): number {
    return this.data_source.get_elevation(location.lat, location.lon);
  }

  // returns a number between 0 and circle_resolution
  get_direction(location: GeoLocation): number {
    const rad = this.location.direction_to(location)
    let dir = Math.floor((this.circle_resolution) * rad / (2 * Math.PI) )
    if (dir < 0) {
      dir += (this.circle_resolution);
    }
    return dir;
  }
  
  init_directions(): void {
    this.directions = [];
    for (let i = 0; i < this.circle_resolution; i++) {
      this.directions[i] = new DirectionalView();
    }
  }

  finish_directions(pass): void {
    for (let i = 0; i < this.circle_resolution; i++) {
      this.directions[i].capture_last_ridge(pass);
    }
  }

  check_point(location: GeoLocation, pass: number) {
    const direction = this.get_direction(location);
    const elevation = this.get_elevation(location)
    if (elevation > this.directions[direction].highest_elevation) {
      this.directions[direction].add_possible_ridge_point(
        location, 
        elevation, 
        this.location.distance_to(location),
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

