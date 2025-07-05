import GeoLocation from './geoLocation';
import {SyncTileSet} from 'srtm-elevation';
//const SyncTileSet = require('srtm-elevation').SyncTileSet;

export default class DataSource {
  tileset: SyncTileSet;
  maxPoint: GeoLocation;
  minPoint: GeoLocation;
  central_location: GeoLocation;

  // distance is in meters
  constructor(central_location: GeoLocation, distance: number) {
    this.central_location = central_location;
    this.minPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.minPoint.move_lat(-distance);
    this.minPoint.move_lon(-distance);
    this.maxPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.maxPoint.move_lat(distance);
    this.maxPoint.move_lon(distance);
  }
  
  async init_tileset(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tileset = new SyncTileSet(
        './cache/', 
        [this.minPoint.lat, this.minPoint.lon], 
        [this.maxPoint.lat, this.maxPoint.lon], 
        (err) => { 
          if (err) {
            console.log(err); 
            reject(err); 
            return 
          } 
          resolve(); 
        });
    });
  }
  
  get_elevation(lat, lon: number): number {
    const elev = this.tileset.getElevation([lat,lon]);
    return elev;
  }
}
