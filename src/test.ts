import GeoLocation from './geoLocation';

class DirectionalView {
   ridges: ElevatedPoint[]
   highest_elevation: number;
   candidate: RidgeCandidatePoint;

   constructor(){
     this.ridges = []
     this.highest_elevation = 0
   }

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
 

// indexed by directions
type Ridge = Array<ElevatedPoint>


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

  constructor(data_source: any, circle_resolution = 90, visual_range = 30000) {
    this.circle_resolution = circle_resolution;
    this.visual_range = visual_range;
    this.data_source = data_source;
  }

  calculate_directional_view(location: GeoLocation): void {
    this.location = location;
    this.init_directions()
    const max_pass = (this.visual_range/this.data_steps);
    for (let i = 1; i < max_pass ; i++) {
      this.traverse_one_ring(i);
    }
    this.finish_directions(max_pass);
    this.build_ridges();
  }

  //todo: connect the dots
  // not strictly necessary at first
  build_ridges(): void {

  }

  //todo implement it!
  get_elevation(location: GeoLocation): number {
    return this.data_source.get_elevation(location.lat, location.lon);
  }

  // returns a number between 0 and 4 * circle_resolution
  get_direction(location: GeoLocation): number {
    const distance =  this.location.distance_to(location);
    const lat_dist = location.lat - this.location.lat;
    const lon_dist = location.lon - this.location.lon;

    let rad = 0;

    if (lon_dist >= 0) {
      rad = Math.asin(lat_dist/distance);
    }
    else {
      rad = Math.PI - Math.asin(- lat_dist/distance);
    }
    if (rad < 0) {
      rad += 2 * Math.PI;
    }
    
    const dir = Math.floor((4 * this.circle_resolution) * rad / (2 * Math.PI) )
    console.log(`${lat_dist}, ${lon_dist}, distance: ${distance}, rad: ${rad}, ${dir}`);
    return dir;
  }
  
  init_directions(): void {
    this.directions = [];
    for (let i = 0; i < 4 * this.circle_resolution; i++) {
      this.directions[i] = new DirectionalView();
    }
  }

  finish_directions(pass): void {
    for (let i = 0; i < 4 * this.circle_resolution; i++) {
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
    console.log(`pass ${distance}`);
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

