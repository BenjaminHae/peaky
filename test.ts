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
       if (this.candidate && (this.candidate.pass - pass) > 1) {
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
     if (this.candidate && (this.candidate.pass - pass) > 1) {
       this.add_ridge_point(this.candidate.point);
     }
   }
}

class ElevatedPoint {
  location: Location
  elevation: number
  distance_to_central_location: number;
  
  constructor(location: Location, elevation: number, distance: number) {
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

//todo implement it!
interface Location {
  lat, lon: number
  // distance is in meters
  move_lat(distance: number)
  // distance is in meters
  move_lon(distance: number)

  // distance in meters
  distance_to(location: Location): number;
}

class View {
  // will be multiplied by 4 to separate the circle into sectors
  circle_resolution: number;
  // visibility in m
  visual_range: number;
  directions: DirectionalView[];
  ridges: Ridge[];
  
  data_steps = 90;//when stepping one px in the elevation file we pass 90m
  data: any;
  location: Location;

  constructor(circle_resolution = 90, visual_range = 30000) {
    this.circle_resolution = circle_resolution;
    this.visual_range = visual_range;
  }

  calculate_directional_view(data: any, location: Location): void {
    this.data = data;
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
  build_ridges(): void {

  }

  //todo implement it!
  get_elevation(location: Location): number {
    return 0
  }

  //todo implement it!
  get_direction(location: Location): number {
    return 0
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

  check_point(location: Location, pass: number) {
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
    const location = { ...this.location };
    //go to top left corner
    location.move_lat((- distance - 1) * this.data_steps);
    location.move_lon(-distance * this.data_steps);
    //move right
    for (let i=0; i<(2*i+1); i++) {
      location.move_lat(this.data_steps);
      this.check_point(location, distance);
    }
    //move down
    for (let i=0; i<(2*i); i++) {
      location.move_lon(this.data_steps, distance);
      this.check_point(location);
    }
    //move left
    for (let i=0; i<(2*i); i++) {
      location.move_lat(-this.data_steps, distance);
      this.check_point(location);
    }
    //move up
    for (let i=0; i<(2*i); i++) {
      location.move_lon(-this.data_steps, distance);
      this.check_point(location);
    }
  }
  

}

