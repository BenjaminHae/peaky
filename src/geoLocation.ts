const R = 6371;// earth radius in km
const deg2rad = (deg) => deg * Math.PI/180; 

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
    const dLat = deg2rad(location.lat - this.lat);
    const dLon = deg2rad(location.lon - this.lon);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.sin(deg2rad(this.lat)) * Math.cos(deg2rad(location.lat)) + 
      Math.sin(dLon/2) * Math.sin(dLon/2) ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d * 1000;
  }
}

