import GeoLocation from './geoLocation';
import DataSource from './dataSource';
import View, {ElevatedPoint, RidgePoint} from './view';
import Canvas from './canvas';
import OsmMapper from './osm_mapper';
import { geoJSONtoFile }  from './geoJSON';
import SilhouetteDrawer from './SilhouetteDrawer';


async function main() {
  // test using St. Gallenkirch with a distance of 30km
  //const location = new GeoLocation(47.020174, 9.978751);// St. Gallenkirch
  const location = new GeoLocation(47.079847, 9.875577);// Golm Stausee

  const max_distance = 50 * 1000;
  const circle_precision = 360*3;//should be divisible by 4
  
  const dataSource = new DataSource(location, max_distance)
  await dataSource.init_tileset();
  
  const view = new View(dataSource, circle_precision, max_distance);
  view.calculate_directional_view(location);

  const min_height = Math.min(...view.directions.map((dir) => Math.min(...dir.ridges.map((ridge)=>ridge.elevation))))
  const max_height = Math.max(...view.directions.map((dir) => Math.max(...dir.ridges.map((ridge)=>ridge.elevation))))
  console.log(`current elevation is ${view.elevation}`);
  console.log(`found elevations from ${min_height} to ${max_height}, and ${view.ridges.length} ridges`);

  const width_factor = 20;
  const canvas = new Canvas(circle_precision, max_height-min_height, 10);

  canvas.paintDirection("N", 0);
  canvas.paintDirection("O", circle_precision / 4);
  canvas.paintDirection("S", circle_precision / 2);
  canvas.paintDirection("W", 3* circle_precision / 4 );

  const osm_mapper = new OsmMapper(300);
  const peaks = osm_mapper.get_peaks(([] as Array<ElevatedPoint>).concat(...view.directions.map(d => d.ridges)).map(e=>e.location));
  
  const silhouetteDrawer = new SilhouetteDrawer(canvas, view.elevation);
  for (let peak of peaks) {
    const dir = view.get_direction(peak.location);
    const dist = view.location.distance_to(peak.location);
    silhouetteDrawer.draw_peak(peak, dir, dist);
  }
 
  //for (let i=0; i< circle_precision; i++) {
  //  for (let item of view.directions[i].ridges) {
  //    canvas.paintDot(i, item.elevation - min_height, 10);
  //  }
  //}

  for (let item of view.ridges) {
    silhouetteDrawer.draw_ridge(item);
    //canvas.paintLine(item.map(point => { return {x: point.direction, y: point.point.elevation-min_height}}));
  }
  canvas.store('./test.png')

  geoJSONtoFile(([] as Array<ElevatedPoint>).concat(...view.directions.map(d => d.ridges)).map(p=>p.location), 'directions.geojson');
  geoJSONtoFile(([] as Array<RidgePoint>).concat(...view.ridges).map(p=>p.point.location), 'ridges.geojson');
}

main();

