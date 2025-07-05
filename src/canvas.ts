import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

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
    this.context.fillRect(0, 0, width, height);
    this.context.fillStyle = "black";
  }

  paintDot(x,y: number,size:number, distance) {
    this.context.fillStyle = `rgb(
        ${Math.floor(255 - 42.5 * distance/max_distance)}
        ${Math.floor(255 - 42.5 * j)}
        0)`;
    this.context.fillRect(x*this.scaling,y,size,size);
  }
  
  store(path: string) {
    const buffer = this.canvas.toBuffer('image/png')
    writeFileSync(path, buffer)
  }
}
