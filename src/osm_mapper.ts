import GeoLocation from './geoLocation';
import { StorageInterface } from 'srtm-elevation-async';
import OSMDownloader, { OSMDownloaderOptions } from './osm/downloader';

function range(start, end: number): Array<number> {
  const a = Array.apply(0, new Array(end - start + 1));
  a.forEach(function(e, i) { a[i] = start + i; });
  return a;
}

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

interface OSMOptions extends OSMDownloaderOptions {
  max_distance?: number
}

interface OSMOptionsInternal extends OSMDownloaderOptions {
  max_distance: number
}

export default class OsmMapper {
  data: Array<Peak> = [];
  tolerance: number;//acceptable distance in meters
  storage: StorageInterface;
  maxPoint: GeoLocation;
  minPoint: GeoLocation;
  central_location: GeoLocation;
  downloader: OSMDownloader;
  options: OSMOptionsInternal;

  constructor (storage: StorageInterface, tolerance: number, central_location: GeoLocation, options: OSMOptions) {
    this.options = Object.assign({
      max_distance: 50 * 1000
    }, options);
    this.tolerance = tolerance;
    this.storage = storage;
    this.central_location = central_location;
    this.minPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.minPoint.move_lat(-this.options.max_distance);
    this.minPoint.move_lon(-this.options.max_distance);
    this.maxPoint = new GeoLocation(central_location.lat, central_location.lon);
    this.maxPoint.move_lat(this.options.max_distance);
    this.maxPoint.move_lon(this.options.max_distance);
    this.downloader = new OSMDownloader(storage, this.options);
  }

  async init(): Promise<void> {
    await this.loadPeaks(this.minPoint, this.maxPoint);
  }

  async loadPeaks(sw, ne: GeoLocation): Promise<void> {
    const rangeSN = range(Math.floor(sw.lat), Math.floor(ne.lat) );
    const rangeWE = range(Math.floor(sw.lon), Math.floor(ne.lon) );

    //todo: do not store as tiles but add to this.data
    const tasks: Array<Promise<void>> = rangeSN.map( (lat, i) => {
        return rangeWE.map( (lng, j) => {
          return (async () => {
            await this.loadPeakTile(new GeoLocation(lat, lng));
            })()
          });
        }).flat();

    // hier ist dieses Promise.all
    await Promise.all(tasks);
    console.log(this.data);
  }

  async loadPeakTile(latLng: GeoLocation): Promise<void> {
    const tileFile = getFileName(latLng);
    if(!(await this.storage.hasTile(tileFile))) {
      await this.downloader.download(tileKey(latLng), tileFile)
    }
    const raw_json = await this.storage.readTile(tileFile);
    const decoder = new TextDecoder();
    const json = JSON.parse(decoder.decode(raw_json));
    const data = json.map(e => new Peak(e[1], e[0], parseInt(e[2]), e[3]))
    this.data = this.data.concat(data);
  }

  async countMissingTilesForArea(sw, ne: GeoLocation): Promise<number> {
    const rangeSN = range(Math.floor(sw.lat), Math.floor(ne.lat) + 1);
    const rangeWE = range(Math.floor(sw.lon), Math.floor(ne.lon) + 1);
    return await this.countMissingTilesForRanges(rangeSN, rangeWE);
  }

  async countMissingTilesForRanges(rangeSN, rangeWE): Promise<number> {
    let missingTiles = 0;
    for(let i = 0; i < rangeSN.length; i++) {
      for(let j = 0; j < rangeWE.length; j++) {
        const latLng = new GeoLocation(Math.floor(rangeSN[i]), Math.floor(rangeWE[j]));
        const key = tileKey(latLng);
        if(!this.downloader.getUrl(key)) 
          continue;
        const tileFile = getFileName(latLng);
        if(!(await this.storage.hasTile(tileFile))) {
          missingTiles++;
        }
      }
    }
    return missingTiles;
  }


  get_peak_for_coordinates(location: GeoLocation): Peak|null {
    //this.data.forEach((p)=>console.log(p.location.distance_to(location)));
    const near_peaks = this.data.filter((p)=>p.location.distance_to(location) < this.tolerance);
     
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

const zeroPad = function(v: number, l: number) {
    let r = v.toString();
    while (r.length < l) {
        r = '0' + r;
    }
    return r;
};

function tileKey(latLng: GeoLocation): string {
  return `${latLng.lat < 0 ? 'S':'N'}${zeroPad(Math.abs(Math.floor(latLng.lat)),2)}${latLng.lon < 0 ? 'W':'E'}${zeroPad(Math.abs(Math.floor(latLng.lon)),3)}`
}

function getFileName(latLng: GeoLocation): string {
  return tileKey(latLng) + '.array.json';
}
