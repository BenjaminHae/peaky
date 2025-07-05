import GeoLocation from './geoLocation';
import DataSource from './dataSource';
import View from './view';
import Canvas from './canvas';


async function main() {
  // test using St. Gallenkirch with a distance of 30km
  const location = new GeoLocation(47.020174, 9.978751);// St. Gallenkirch
  const max_distance = 30 * 1000;
  
  const dataSource = new DataSource(location, max_distance)
  await dataSource.init_tileset();
  
  const view = new View(dataSource, 360, max_distance);
  view.calculate_directional_view(location);

  const min_height = Math.min(...view.directions.map((dir) => Math.min(...dir.ridges.map((ridge)=>ridge.elevation))))
  const max_height = Math.max(...view.directions.map((dir) => Math.max(...dir.ridges.map((ridge)=>ridge.elevation))))
  console.log(`found elevations from ${min_height} to ${max_height}`);
  
  const width_factor = 20;
  const canvas = new Canvas(360*width_factor, max_height-min_height);

  for (let i=0; i< 360; i++) {
    for (let item of view.directions[i].ridges) {
      canvas.paintDot(i, item.elevation - min_height, width_factor);
    }
  }
  
  canvas.store('./test.png')
}

main();

