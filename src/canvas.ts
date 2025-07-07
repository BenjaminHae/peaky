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

  invert_point(y: number): number {
    return this.height - y;
  }

  paintDot(x,y: number, size:number, distance?: number) {
    //this.context.fillStyle = `rgb(
    //    ${Math.floor(255 - 42.5 * distance/max_distance)}
    //    ${Math.floor(255 - 42.5 * j)}
    //    0)`;
    this.context.fillStyle = "black";
    this.context.fillRect(x*this.scaling,this.invert_point(y),size,size);
  }
  
  paintLine(points: Array<Point>) {
    this.context.fillStyle = "black";
    this.context.beginPath();
    this.context.moveTo(points[0].x * this.scaling, this.invert_point(points[0].y));
    for (let i = 1; i < points.length; i++) {
      this.context.lineTo(points[i].x * this.scaling, this.invert_point(points[i].y));
    }
    this.context.stroke();
  }

  paintDirection(name: string, position: number, size = 20) {
    this.context.fillStyle = "red";
    this.context.beginPath();
    this.context.moveTo(position * this.scaling, 0);
    this.context.lineTo(position * this.scaling + size, 2 * size);
    this.context.lineTo(position * this.scaling - size, 2 * size);
    this.context.fill();
    this.context.font = `${3*size}px serif`;
    this.context.textAlign = 'center';
    this.context.fillText(name, position * this.scaling, 5 * size + 1);
    if (position == 0) {
      this.paintDirection(name, this.width, size);
    }
  }

  paintPeak(name: string, elevation: number, direction): void {
    this.context.font = `$20px serif`;
    this.context.textAlign = 'center';
    this.context.fillText(`${name}\r\n${elevation} m`, direction * this.scaling, this.invert_point(elevation) - 7 * 10 + 1);
  }
  
  store(path: string) {
    const buffer = this.canvas.toBuffer('image/png')
    writeFileSync(path, buffer)
  }
}
