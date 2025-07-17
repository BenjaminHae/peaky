import Canvas from './canvas';
import { ElevatedPoint, Ridge, RidgePoint } from './view';
import { Peak } from './osm_mapper';

const MAGIC_PROJECTION_DISTANCE = 2000;
const MAGIC_HORIZON_OFFSET = 500;

class ProjectedPoint {
  height: number;
  ridgePoint: RidgePoint;
  constructor(height: number, ridgePoint: RidgePoint) {
    this.height = height;
    this.ridgePoint = ridgePoint;
  }
}

export default class SilhouetteDrawer {
  canvas: Canvas;
  central_height: number;
  direction_resolution: number;

  constructor(canvas: Canvas, central_height: number, direction_resolution: number = 360) {
    this.canvas = canvas;
    this.central_height = central_height;
    this.direction_resolution = direction_resolution;
  }

  projected_height(distance, height: number): number {
    return (height - this.central_height)/distance * MAGIC_PROJECTION_DISTANCE + MAGIC_HORIZON_OFFSET
  }

  projected_point(point: RidgePoint): ProjectedPoint {
    return new ProjectedPoint(
      this.projected_height(point.point.distance_to_central_location, point.point.elevation),
      point);
  }

  draw_ridge(ridge: Ridge) {
    let first = true;
    let previous_item: RidgePoint|null = null;
    for (let item of ridge) {
      const p = this.projected_point(item);
      if (previous_item && (Math.abs(previous_item.direction-item.direction) > this.direction_resolution/4)) {
        this.canvas.endPaintPath();
        first = true;
      }
      if (first) {
        this.canvas.startPaintPath(p.ridgePoint.direction, p.height);
        first = false;
      }
      else {
        this.canvas.nextPaintPath(p.ridgePoint.direction, p.height);
      }
      previous_item = item;
    }
    this.canvas.endPaintPath();
  }

  draw_peak(peak: Peak, direction, distance: number) {
    console.log(`${peak.name}, ${peak.elevation}, ${distance}, ${direction}, projected: ${this.projected_height(distance, peak.elevation)}`);
    this.canvas.paintPeak(peak.name, peak.elevation, this.projected_height(distance, peak.elevation), direction);
  }
}
