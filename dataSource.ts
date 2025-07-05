import GeoLocation from './geoLocation';
import {SyncTileSet} from 'srtm-elevation';
//const SyncTileSet = require('srtm-elevation').SyncTileSet;

export default class DataSource {
  tileset: SyncTileSet;
  maxPoint: GeoLocation;
  minPoint: GeoLocation;

  // distance is in meters
  constructor(central_location: GeoLocation, distance: number) {
    this.minPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.minPoint.move_lat(-distance);
    this.minPoint.move_lon(-distance);
    this.maxPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.maxPoint.move_lat(distance);
    this.maxPoint.move_lon(distance);
    this.tileset = new SyncTileSet('./cache/', [this.minPoint.lat, this.minPoint.lon], [this.maxPoint.lat, this.maxPoint.lon], function (err) { if (err) {console.log(err); }});
    console.log(this.get_elevation(central_location.lat, central_location.lon));
  }
  
  get_elevation(lat, lon: number): number {
    const elev = this.tileset.getElevation([lat,lon]);
    console.log(elev);
    return elev;
  }
}
