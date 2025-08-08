import GeoLocation from './geoLocation';
import {ElevatedPoint, RidgePoint} from './view';
import { Canvas } from 'canvas';
import { geoJSONtoFile }  from './geoJSON';
import { writeFileSync } from 'fs';
import { SrtmStorage } from 'srtm-elevation-async-node';
import Peaky from './Peaky';


async function main() {
  // test using St. Gallenkirch with a distance of 30km
  const location = new GeoLocation(49.22730, 9.14861);// BW
  //const location = new GeoLocation(47.020174, 9.978751);// St. Gallenkirch
  //const location = new GeoLocation(47.079847, 9.875577);// Golm Stausee
  //const location = new GeoLocation(47.48003, 7.81705 );// Vincent

  const storage = new SrtmStorage('./data/');
  const peaky = new Peaky(storage, location);
  await peaky.init();
  await peaky.calculateRidges();
  const {min_height, max_height } = peaky.getDimensions();

  console.log(`current elevation is ${peaky.view?.elevation}`);
  console.log(`found elevations from ${min_height} to ${max_height}, and ${peaky.view?.ridges.length} ridges`);

  await peaky.findPeaks();
  console.log(`found ${peaky.peaks.length} peaks`);

  const canvas = await peaky.drawView();

  //writeFile
  const buffer = (canvas as Canvas).toBuffer('image/png')
  writeFileSync('test.png', buffer)

  //geoJSONtoFile(([] as Array<ElevatedPoint>).concat(...peaky.view.directions.map(d => d.ridges)).map(p=>p.location), 'directions.geojson')
  //geoJSONtoFile(([] as Array<RidgePoint>).concat(...peaky.view.ridges).map(p=>p.point.location), 'ridges.geojson');
}

main();

