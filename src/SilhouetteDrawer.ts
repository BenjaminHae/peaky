import Canvas from './canvas';
import { ElevatedPoint, Ridge, RidgePoint } from './view';
import { Peak } from './osm_mapper';

const MAGIC_PROJECTION_DISTANCE = 2000;

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

  constructor(canvas: Canvas, central_height: number) {
    this.canvas = canvas;
    this.central_height = central_height;
  }

  projected_height(distance, height: number): number {
    return (height - this.central_height)/distance * MAGIC_PROJECTION_DISTANCE
  }

  projected_point(point: RidgePoint): ProjectedPoint {
    return new ProjectedPoint(
      this.projected_height(point.point.distance_to_central_location, point.point.elevation),
      point);
  }

  draw_ridge(ridge: Ridge) {
    let first = true;
    for (let item of ridge) {
      const p = this.projected_point(item);
      if (first) {
        this.canvas.startPaintPath(p.ridgePoint.direction, p.height);
        first = false;
      }
      else {
        this.canvas.nextPaintPath(p.ridgePoint.direction, p.height);
      }
    }
    this.canvas.endPaintPath();
  }

  draw_peak(peak: Peak, direction, distance: number) {
    console.log(`${peak.name}, ${peak.elevation}, ${distance}, ${direction}, projected: ${this.projected_height(distance, peak.elevation)}`);
    this.canvas.paintPeak(peak.name, peak.elevation, this.projected_height(distance, peak.elevation), direction);
  }
}
