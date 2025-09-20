const R = 6371;// earth radius in km
const deg2rad = (deg) => deg * Math.PI/180; 

// distance in meters > 0 and returns meters(> 0)
export function earth_curvature_offset(d: number): number {
  return (R*1000)*(1 - Math.cos(d/(R*1000)))
}


export default class GeoLocation {
  lat: number
  lon: number
  constructor (lat, lon: number) {
    this.lat = lat;
    this.lon = lon;
  }

  // distance is in meters, moving north, south
  move_lat(distance: number) {
    // this does not depend on lon
    // 1 deg ~ 111km
    this.lat += 360*(distance/1000)/(2*Math.PI*R)
  }

  // distance is in meters, moving east,west
  move_lon(distance: number) {
    // this depends on the lat!
    const lat_rad = R * Math.cos(deg2rad(this.lat));
    this.lon += 360*(distance/1000)/(2*Math.PI*lat_rad)
  }

  // distance in meters
  distance_to(location: GeoLocation): number {
    const p1 = deg2rad(this.lat);
    const p2 = deg2rad(location.lat);

    const deltaLambda = deg2rad(location.lon - this.lon);
    const d = Math.acos(
        Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(deltaLambda)
      ) * R * 1000;
    return d;
  }

  // returns the direction to location in radians
  direction_to(location: GeoLocation): number {
    // https://math.stackexchange.com/questions/3812110/calculation-of-direction-between-two-geographical-points
    const latA = deg2rad(this.lat)
    const latB = deg2rad(location.lat)
    const lonA = deg2rad(this.lon)
    const lonB = deg2rad(location.lon)
    const delta_phi = Math.log( Math.tan( latB /2 + Math.PI /4) / Math.tan(latA / 2 + Math.PI / 4))
    const delta_lon = lonA - lonB
    return Math.atan2(delta_lon, delta_phi);
  }

  to_array(): Array<number> {
    return [this.lat, this.lon];
  }
}

