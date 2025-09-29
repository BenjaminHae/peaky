import GeoLocation from './geoLocation';
import DataSource, { DataSourceOptions } from './dataSource';
import { StorageInterface } from 'srtm-elevation-async';
import View, { ElevatedPoint } from './view';
import OsmMapper, { Peak } from './osm_mapper';
import Canvas from './canvas';
import SilhouetteDrawer, { projected_height } from './SilhouetteDrawer';

const MAGIC_PEAK_TOLERANCE = 200;
const MAGIC_MAX_TILE_LOAD_DISTANCE = 50 * 1000;
const MAGIC_CIRCLE_PRECISION = 360 * 10;
const MAGIC_HORIZONTAL_SCALING = 2;
const MAGIC_CANVAS_TOP_MARGIN = 800;

export interface PeakyOptions extends DataSourceOptions {
  max_distance?: number;
  circle_precision?: number;
  elevation?: number;
}

interface PeakyOptionsInternal extends DataSourceOptions {
  max_distance: number;
  circle_precision: number;
  elevation?: number;
}

export class PeakWithDistance extends Peak {
  distance: number;
  direction: number;
}

export interface Status {
  state_no: number;
  state_max: number;
  sub?: string;
  sub_no?: number;
  sub_max?: number;
}

export const StatusMap = ["not started" , "loading_files" , "identifying local maxima" , "connecting ridges" , "identifying peaks" , "finished"];

type StatusListener = (s: Status) => void;

const generateError = (msg: string, cause: Error) => new Error(msg + '\r\n' + cause.message, {cause});

export default class Peaky {
  storage: StorageInterface;
  options: PeakyOptionsInternal;
  dataSource: DataSource;
  location: GeoLocation;
  view?: View;
  peaks: Array<PeakWithDistance>;
  statusListener: Array<StatusListener> = [];
  status: Status = {
    state_no: 0,
    state_max: StatusMap.length
  }

  constructor(storage: StorageInterface, location: GeoLocation, options?: PeakyOptions) {
    this.options = Object.assign({
      max_distance: MAGIC_MAX_TILE_LOAD_DISTANCE,
      circle_precision: MAGIC_CIRCLE_PRECISION
    }, options);
    this.storage = storage;
    this.dataSource = new DataSource(location, this.options.max_distance, this.storage, this.options);
    this.peaks = [];
    this.location = location;
  }


  async init() {
    this.setStatus({state_no: 1});
    try {
      await this.dataSource.init_tileset();
    } catch (cause) {
      throw generateError("Failure downloading elevation tilesets", cause)
    }
  }

  setStatus({state_no = this.status.state_no, state_max = StatusMap.length, sub = undefined, sub_no = undefined, sub_max = undefined}: any ) {//todo type!
    //trick so I can just set sub_no
    if (state_no === this.status.state_no) {
      if (!sub) {
        sub = this.status.sub;
      }
      if (!sub_max) {
        sub_max = this.status.sub_max;
      }
    }
    this.status = {state_no, state_max, sub, sub_no, sub_max};
    this.statusListener.forEach((l) => {new Promise<void>((r) => {l(this.status); r();})});
  }

  calculateRidges() {
    this.setStatus({state_no: 2});
    this.view = new View(this.dataSource, this.options.circle_precision, this.options.max_distance);
    const cb = (job, current, max) => {
      if (job === "ridges") {
        this.setStatus({state_no: 3, sub_no: current, sub_max: max});
      }
      else {
        this.setStatus({sub_no: current, sub_max: max});
      }
    }
    try {
      this.view.calculate_directional_view(this.location, this.options.elevation, cb);
    } catch (cause) {
      throw generateError("Failure during calculation of view", cause)
    }
  }

  async findPeaks() {
    this.setStatus({state_no: 4});
    if (!this.view) {
      throw new Error("ridges have not been calculated yet");
    }
    const view = this.view;
    let osm_mapper: OsmMapper;
    try {
      osm_mapper = new OsmMapper(this.storage, MAGIC_PEAK_TOLERANCE, this.location, {max_distance: MAGIC_MAX_TILE_LOAD_DISTANCE});
    } catch (cause) {
      throw generateError("Initializing OSM failed", cause)
    }
    try {
      await osm_mapper.init();
    } catch (cause) {
      throw generateError("Downloading OSM data failed", cause)
    }
    // just all ridges that have been painted combined
    const possible_peak_points = ([] as Array<ElevatedPoint>).concat(
             ...this.view.ridges.map(
                 r=> r.filter(p => p.local_max)
                      .map(rp => rp.point))
             );
    this.setStatus({sub_no: 0, sub_max:possible_peak_points.length});
    const cb = (current) => {
      this.setStatus({sub_no: current});
    }
    cb(0);
    try {
      this.peaks = osm_mapper
          .get_peaks(
               possible_peak_points,
               cb
           )
          .map(p => {
            (p as PeakWithDistance).direction = view.get_direction(p.location);
            (p as PeakWithDistance).distance = view.location.distance_to(p.location);
            return p as PeakWithDistance;
          });
    } catch (cause) {
      throw generateError("Reading peaks failed", cause)
    }
    this.setStatus({state_no: 5});
  }

  getDimensions(horizon_offset?: number) {
    if (!this.view) {
      throw new Error("ridges have not been calculated yet");
    }

    const min_height = Math.min(...this.view.ridges.map((ridge) => Math.min(...ridge.map((point)=>point.point.elevation))));
    const max_height = Math.max(...this.view.ridges.map((ridge) => Math.max(...ridge.map((point)=>point.point.elevation))));
    const central_elevation = this.view.elevation;
    const min_projected_height = Math.min(...this.view.ridges.map((ridge) => Math.min(...ridge.map((point)=>projected_height(central_elevation, point.point.distance_to_central_location, point.point.elevation, horizon_offset)))));
    const max_projected_height = Math.max(...this.view.ridges.map((ridge) => Math.max(...ridge.map((point)=>projected_height(central_elevation, point.point.distance_to_central_location, point.point.elevation, horizon_offset)))));
    return { 
      min_height: min_height, 
      max_height: max_height, 
      min_projected_height: min_projected_height, 
      max_projected_height: max_projected_height, 
      circle_precision: this.options.circle_precision 
    };
  }

  drawView(canvasElement?: HTMLCanvasElement | OffscreenCanvas, with_peaks: boolean = true, {  horizon_offset = MAGIC_CANVAS_TOP_MARGIN, paint_direction = true, colors = undefined } = {} ) {
    if (!this.view) {
      throw new Error("ridges have not been calculated yet");
    }
    const dim = this.getDimensions(with_peaks? horizon_offset : 0);
    let height = dim.max_projected_height - dim.min_projected_height
    if (with_peaks) {
     height += horizon_offset;
    }
    let scaling = MAGIC_HORIZONTAL_SCALING;
    if (canvasElement) {
      height = canvasElement.height;
      scaling = canvasElement.width / this.options.circle_precision;
    }

    const canvas = new Canvas(this.options.circle_precision, height, scaling, canvasElement, colors);

    if (paint_direction) {
      canvas.paintDirection("N", 0);
      canvas.paintDirection("O", 1/4 * this.options.circle_precision);
      canvas.paintDirection("S", 2/4 * this.options.circle_precision);
      canvas.paintDirection("W", 3/4 * this.options.circle_precision);
    }
    const silhouetteDrawer = new SilhouetteDrawer(canvas, this.view.elevation, this.options.circle_precision, with_peaks? horizon_offset : 0);
    silhouetteDrawer.min_projected_height = dim.min_projected_height;
    if (with_peaks) {
      console.log("drawing peaks");
      for (let peak of this.peaks) {
        silhouetteDrawer.draw_peak(peak, peak.direction, peak.distance);
      }
    }
 
  //for (let i=0; i< circle_precision; i++) {
  //  for (let item of view.directions[i].ridges) {
  //    canvas.paintDot(i, item.elevation - min_height, 10);
  //  }
  //}

    for (let item of this.view.ridges) {
      silhouetteDrawer.draw_ridge(item);
      //canvas.paintLine(item.map(point => { return {x: point.direction, y: point.point.elevation-min_height}}));
    }
    return canvas.canvas;
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListener.push(listener);
  }
}
