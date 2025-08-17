import GeoLocation from './geoLocation';
import DataSource, { DataSourceOptions } from './dataSource';
import { StorageInterface } from 'srtm-elevation-async';
import View, { ElevatedPoint } from './view';
import OsmMapper, { Peak } from './osm_mapper';
import Canvas from './canvas';
import SilhouetteDrawer, { projected_height } from './SilhouetteDrawer';

const MAGIC_PEAK_TOLERANCE = 300;
const MAGIC_MAX_TILE_LOAD_DISTANCE = 50 * 1000;
const MAGIC_CIRCLE_PRECISION = 360 * 10;
const MAGIC_HORIZONTAL_SCALING = 1;
const MAGIC_CANVAS_TOP_MARGIN = 800;

interface PeakyOptions extends DataSourceOptions {
  max_distance?: number;
  circle_precision?: number;
  elevation?: number;
}

interface PeakyOptionsInternal extends DataSourceOptions {
  max_distance: number;
  circle_precision: number;
  elevation?: number;
}

export default class Peaky {
  storage: StorageInterface;
  options: PeakyOptionsInternal;
  dataSource: DataSource;
  location: GeoLocation;
  view?: View;
  peaks: Array<Peak>;

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
    await this.dataSource.init_tileset();
  }

  calculateRidges() {
    this.view = new View(this.dataSource, this.options.circle_precision, this.options.max_distance);
    this.view.calculate_directional_view(this.location, this.options.elevation);
  }

  async findPeaks() {
    if (!this.view) {
      throw new Error("ridges have not been calculated yet");
    }
    const osm_mapper = new OsmMapper(this.storage, MAGIC_PEAK_TOLERANCE, this.location, {max_distance: MAGIC_MAX_TILE_LOAD_DISTANCE});
    await osm_mapper.init();
    this.peaks = osm_mapper.get_peaks(([] as Array<ElevatedPoint>).concat(...this.view.directions.map(d => d.ridges)).map(e=>e.location));
  }

  //todo add perspective max_height
  getDimensions() {
    if (!this.view) {
      throw new Error("ridges have not been calculated yet");
    }

    const min_height = Math.min(...this.view.directions.map((dir) => Math.min(...dir.ridges.map((ridge)=>ridge.elevation))))
    const max_height = Math.max(...this.view.directions.map((dir) => Math.max(...dir.ridges.map((ridge)=>ridge.elevation))))
/// todo ridge.distance gibt es nicht
    const central_elevation = this.view.elevation;
    const min_projected_height = Math.min(...this.view.directions.map((dir) => Math.min(...dir.ridges.map((ridge)=>projected_height(central_elevation, ridge.distance_to_central_location, ridge.elevation)))));
    const max_projected_height = Math.max(...this.view.directions.map((dir) => Math.max(...dir.ridges.map((ridge)=>projected_height(central_elevation, ridge.distance_to_central_location, ridge.elevation)))));
    return {min_height: min_height, max_height: max_height, min_projected_height: min_projected_height, max_projected_height: max_projected_height};
  }

  drawView(canvasElement?: HTMLCanvasElement) {
    if (!this.view) {
      throw new Error("ridges have not been calculated yet");
    }
    const dim = this.getDimensions();
    let height = dim.max_projected_height - dim.min_projected_height + MAGIC_CANVAS_TOP_MARGIN;
    let scaling = MAGIC_HORIZONTAL_SCALING;
    if (canvasElement) {
      height = canvasElement.height;
      scaling = canvasElement.width / this.options.circle_precision;
    }

    const canvas = new Canvas(this.options.circle_precision, height, scaling, canvasElement);

    canvas.paintDirection("N", 0);
    canvas.paintDirection("O", 1/4 * this.options.circle_precision);
    canvas.paintDirection("S", 2/4 * this.options.circle_precision);
    canvas.paintDirection("W", 3/4 * this.options.circle_precision);
    const silhouetteDrawer = new SilhouetteDrawer(canvas, this.view.elevation);
    for (let peak of this.peaks) {
      const dir = this.view.get_direction(peak.location);
      const dist = this.view.location.distance_to(peak.location);
      silhouetteDrawer.draw_peak(peak, dir, dist);
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
}
