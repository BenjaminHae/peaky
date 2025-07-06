import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

interface Point {
  x, y: number;
}

export default class Canvas {
  width: number;
  height: number;
  canvas: any;
  context: any;
  max_distance: number;
  scaling: number
  
  constructor(width, height: number, scaling: number) {
    this.width = width;
    this.height = height;
    this.scaling = scaling;
    this.canvas = createCanvas(width*scaling, height);
    this.context = this.canvas.getContext('2d');
    this.context.fillStyle = "white";
    this.context.fillRect(0, 0, width*scaling, height);
    this.context.fillStyle = "black";
  }

  paintDot(x,y: number, size:number, distance?: number) {
    //this.context.fillStyle = `rgb(
    //    ${Math.floor(255 - 42.5 * distance/max_distance)}
    //    ${Math.floor(255 - 42.5 * j)}
    //    0)`;
    this.context.fillRect(x*this.scaling,y,size,size);
  }
  
  paintLine(points: Array<Point>) {
    this.context.beginPath();
    this.context.moveTo(points[0].x * this.scaling, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.context.lineTo(points[i].x * this.scaling, points[i].y);
    }
    this.context.stroke();
  }
  
  store(path: string) {
    const buffer = this.canvas.toBuffer('image/png')
    writeFileSync(path, buffer)
  }
}
