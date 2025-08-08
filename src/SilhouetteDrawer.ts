import Canvas from './canvas';
import { ElevatedPoint, Ridge, RidgePoint } from './view';
import { Peak } from './osm_mapper';

const MAGIC_PROJECTION_DISTANCE = 2000;
const MAGIC_HORIZON_OFFSET = 500;

export default class SilhouetteDrawer {
  canvas: Canvas;
  central_height: number;
  direction_resolution: number;
  top_offset: number;

  constructor(canvas: Canvas, central_height: number, direction_resolution: number = 360, top_offset: number = 200) {
    this.canvas = canvas;
    this.central_height = central_height;
    this.direction_resolution = direction_resolution;
    this.top_offset = top_offset;
  }

  projected_height(distance, height: number): number {
    return projected_height(this.central_height, distance, height);
  }

  projected_height_from_point(point: RidgePoint): number {
    return this.projected_height(point.point.distance_to_central_location, point.point.elevation);
  }

  draw_ridge(ridge: Ridge) {
    let first = true;
    let previous_item: RidgePoint|null = null;
    for (let item of ridge) {
      if (previous_item && (Math.abs(previous_item.direction-item.direction) > this.direction_resolution/4)) {
        this.canvas.endPaintPath();
        first = true;
      }
      const projected_height = this.projected_height_from_point(item);
      if (first) {
        this.canvas.startPaintPath(item.direction, projected_height - this.top_offset);
        first = false;
      }
      else {
        this.canvas.nextPaintPath(item.direction, projected_height - this.top_offset);
      }
      previous_item = item;
    }
    this.canvas.endPaintPath();
  }

  draw_peak(peak: Peak, direction, distance: number) {
    this.canvas.paintPeak(peak.name, peak.elevation, this.projected_height(distance, peak.elevation) - this.top_offset, direction);
  }
}

export function projected_height(central_height, distance, height: number): number {
  return (height - central_height)/distance * MAGIC_PROJECTION_DISTANCE + MAGIC_HORIZON_OFFSET
}
