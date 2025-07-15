import GeoLocation from './geoLocation';
import {readFileSync} from 'fs';

export class Peak {
  location: GeoLocation;
  elevation: number;
  name: string;
  constructor(lat,lon: number, elevation: string|number, name: string) {
    this.location = new GeoLocation(lat, lon)
    this.elevation = Number(elevation)
    this.name = name
  }
}

export default class OsmMapper {
  data: Array<Peak>;
  tolerance: number;//acceptable distance in meters
  constructor (tolerance: number) {
    const raw_json = readFileSync('./osm/export.simple.json', 'utf-8');
    const json = JSON.parse(raw_json);
    this.data = json.map(e => new Peak(e.lon, e.lat, e.e, e.n));
    this.tolerance = tolerance;
  }

  get_peak_for_coordinates(location: GeoLocation): Peak|null {
    //this.data.forEach((p)=>console.log(p.location.distance_to(location)));
    const near_peaks = this.data.filter((p)=>p.location.distance_to(location)<this.tolerance);
     
    const last_element = near_peaks.reduce(
        (min, p) => {
          if ((p.name == null) || (p.name === undefined)){
            return min
          }
          const dist = p.location.distance_to(location);
          if (dist < min.dist){
            return {dist: dist, item: p}
          }
          else {
            return min
          }
        }, 
        {dist: this.tolerance, item: null})
    if (last_element.item) {
      return last_element.item;
    }
    return null
  }

  get_peaks(locations: Array<GeoLocation>): Array<Peak> {
    const peaks: Array<Peak> = [];
    for (let location of locations) {
      let peak = this.get_peak_for_coordinates(location);
      if (peak && peaks.indexOf(peak) <0 ) {
        peaks.push(peak)
      }
    }
    return peaks;
  }
}
