import { Canvas as CanvasElt, createCanvas } from 'canvas';

interface Point {
  x, y: number;
}

export default class Canvas {
  width: number;
  height: number;
  canvas: CanvasElt | HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D;
  max_distance: number;
  scaling: number
  
  constructor(width, height: number, scaling: number, canvas?: CanvasElt | HTMLCanvasElement | OffscreenCanvas) {
    this.width = width;
    this.height = height;
    this.scaling = scaling;
    this.canvas = canvas ? canvas : createCanvas(width*scaling, height);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, width*scaling, height);
    this.ctx.fillStyle = "black";
  }

  invert_point(y: number): number {
    return this.height - y;
  }

  paintDot(x,y: number, size:number, distance?: number) {
    //this.ctx.fillStyle = `rgb(
    //    ${Math.floor(255 - 42.5 * distance/max_distance)}
    //    ${Math.floor(255 - 42.5 * j)}
    //    0)`;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(x * this.scaling,this.invert_point(y),size,size);
  }

  startPaintPath(direction, projected_height: number) {
    this.ctx.fillStyle = "black";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(direction * this.scaling, this.invert_point(projected_height));
  }

  nextPaintPath(direction, projected_height) {
    this.ctx.lineTo(direction * this.scaling, this.invert_point(projected_height));
  }

  endPaintPath() {
    this.ctx.stroke();
  }
  
  paintLine(points: Array<Point>) {
    this.ctx.fillStyle = "black";
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x * this.scaling, this.invert_point(points[0].y));
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x * this.scaling, this.invert_point(points[i].y));
    }
    this.ctx.stroke();
  }

  paintDirection(name: string, position: number, size = 20) {
    this.ctx.fillStyle = "red";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(position * this.scaling, 0);
    this.ctx.lineTo(position * this.scaling + size, 2 * size);
    this.ctx.lineTo(position * this.scaling - size, 2 * size);
    this.ctx.fill();
    this.ctx.font = `${3*size}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, position * this.scaling, 5 * size + 1);
    if (position == 0) {
      this.paintDirection(name, this.width, size);
    }
  }

  paintPeak(name: string, elevation, projected_elevation, direction: number): void {
    this.ctx.fillStyle = "black";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(direction * this.scaling, this.invert_point(projected_elevation));
    this.ctx.lineTo(direction * this.scaling, this.invert_point(projected_elevation) - 80);
    this.ctx.stroke();
    this.ctx.save();
    this.ctx.font = `$20px serif`;
    this.ctx.textAlign = 'left';
    this.ctx.translate(direction * this.scaling, this.invert_point(projected_elevation) - 80 - 10);
    this.ctx.rotate(-60 * Math.PI / 180);
    this.ctx.fillText(`${name} - ${elevation.toFixed(0)} m`, 0, 0);
    this.ctx.restore();
  }
  
}
