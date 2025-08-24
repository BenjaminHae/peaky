import Peaky, { PeakyOptions, PeakWithDistance } from './Peaky';
import { Ridge } from './view';
import GeoLocation from './geoLocation';
//import SrtmStorage from './srtmStorage';
import StorageInterface from 'srtm-elevation-async';
import { projected_height } from './SilhouetteDrawer';

export default Peaky;
export { GeoLocation, StorageInterface, projected_height, PeakyOptions, PeakWithDistance, Ridge };
