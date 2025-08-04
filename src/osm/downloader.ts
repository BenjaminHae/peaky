import { StorageInterface } from 'srtm-elevation-async';

import {
  BlobReader,
  ZipReader
} from '@zip.js/zip.js';

export interface OSMDownloaderOptions {
  provider?: string;
}

interface OSMDownloaderOptionsInternal {
  provider: string;
}

export default class OSMDownloader {
  options: OSMDownloaderOptionsInternal;
  timeout: number;
  downloads: {[index: string]: Promise<any>}; // todo type
  storage: StorageInterface;
  constructor(storage: StorageInterface, options?: OSMDownloaderOptions) {
    this.options = Object.assign({
        provider: '/Peaks_{lat}{lng}.array.json',
    }, options);
    this.timeout = 30000; // Global fetch timeout
    //this._httpsAgent = new https.Agent({ rejectUnauthorized: false }); // Ignore SSL certificates
    this.storage = storage;
    this.downloads = {};
  }

  // for calls with the same tileKey, only the first one blocks, all other resolve immediately
  // do we need latLng?
  async download(tileKey: string, destination: string): Promise<void>{
    const cleanup = () => {
        delete this.downloads[tileKey];
    }

    const url = this.getUrl(tileKey);

    if(!url) {
        return;
    }

    // todo: do we need to return this?
    const download = this.downloads[tileKey];

    if (!download) {
      try {
        this.downloads[tileKey] = this._download(url);
        const zipped = await this.downloads[tileKey];
        const data = await this.unzip(zipped)
        await this.storage.writeTile(destination, data);
      } finally {
        cleanup();
      }
    }
  }

  getUrl(tileKey: string): string|undefined {
    let url:string|undefined;
    //if(srtmDb.includes(tileKey)) {
      const lat = tileKey.substr(0, 3);
      const lng = tileKey.substr(3, 4);
      url = this.options.provider.replace(/{lat}/g, lat).replace(/{lng}/g, lng);
    //}
    return url;
  }

  async _download(url: string):Promise<Blob> { // todo
    const _options: RequestInit = {};
    _options.signal = AbortSignal.timeout(this.timeout);
    _options.headers = {};
    let response;
    try {
        response = await fetch(url, _options);
        if(response.status === 200) {
            return await response.blob();
        } else {
            throw new Error(`Error downloading file, HTTP Status ${response.status}`);
        }
    } catch(err) {
        throw new Error(err || response?.headers['www-authenticate'] || response);
    }
  }

  async unzip(zipFileBlob: Blob): Promise<ArrayBuffer> {
    const zipFileReader = new BlobReader(zipFileBlob);
    
    // Creates a ZipReader object reading the zip content via `zipFileReader`,
    // retrieves metadata (name, dates, etc.) of the first entry, retrieves its
    // content via `helloWorldWriter`, and closes the reader.
    const zipReader = new ZipReader(zipFileReader);
    const firstEntry = (await zipReader.getEntries()).shift();
    if (!firstEntry?.getData) {
      throw new Error('Zip file not readable');
    }
    return await firstEntry?.arrayBuffer();
  }
}
