import GeoLocation from './geoLocation';
import {writeFileSync} from 'fs';

export default function geoJSON(points: Array<GeoLocation>): string {
  const data = { "type": "FeatureCollection",
  "features": points.map( p => {return { "type": "Feature",
      "geometry":{"type": "Point",
    "coordinates": [p.lon, p.lat]} }})
};
  return JSON.stringify(data);
}

export function geoJSONtoFile(points: Array<GeoLocation>, path: string): void {
  writeFileSync(path, geoJSON(points), 'utf8');
}
