import GeoLocation from './geoLocation';
import SyncTileSet, { StorageInterface, LatLng } from 'srtm-elevation-async';

export default class DataSource {
  tileset: SyncTileSet;
  maxPoint: GeoLocation;
  minPoint: GeoLocation;
  central_location: GeoLocation;
  storage: StorageInterface;

  // distance is in meters
  constructor(central_location: GeoLocation, distance: number, storage: StorageInterface) {
    this.central_location = central_location;
    this.minPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.minPoint.move_lat(-distance);
    this.minPoint.move_lon(-distance);
    this.maxPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.maxPoint.move_lat(distance);
    this.maxPoint.move_lon(distance);
    this.storage = storage;
  }
  
  async init_tileset(): Promise<void> {
    this.tileset = new SyncTileSet(this.storage, new LatLng(this.minPoint.lat,this.minPoint.lon), new LatLng(this.maxPoint.lat, this.maxPoint.lon));
    await this.tileset.init();
  }
  
  get_elevation(lat, lon: number): number {
    return this.tileset.getElevation(new LatLng(lat,lon));
  }
}
