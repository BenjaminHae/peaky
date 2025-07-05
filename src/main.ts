import GeoLocation from './geoLocation';
import DataSource from './dataSource';
import View from './test';


const location = new GeoLocation(47.020174, 9.978751);
const max_distance = 10 * 1000;

// test using St. Gallenkirch with a distance of 10km
const dataSource = new DataSource(location, max_distance)

const view = new View(dataSource, 90, max_distance);
view.calculate_directional_view(location);
console.log(view.directions);

