import registerPromiseWorker from 'promise-worker/register';
import CryptoJS from 'crypto-js';
import { getID } from '@/utils/id-generator';
import { FileItem, Manifest, DatabaseItem } from '@/utils/types';

function parseConfig(configString: string): FileItem[] {
  const config: { fileItems?: FileItem[]; files?: FileItem[] } = JSON.parse(configString);
  if (config.fileItems) {
    const cacheRoot = { name: 'root', type: 'folder', files: [], id: 0 };
    config.fileItems.forEach(({ name: pathString, size, digest, uploadTime, start, end }) => {
      if (!uploadTime) uploadTime = Date.now();
      const path = pathString.substring(1).split('/');
      const type = digest ? 'file' : 'folder';
      let filePointer: FileItem = cacheRoot;
      const id = getID();
      for (let i = 0; i < path.length - 1; i++) {
        const nextPointer = filePointer.files?.find(e => e.name === path[i]);
        const id = getID();
        if (nextPointer) filePointer = nextPointer;
        else {
          const item: FileItem = { name: path[i], type: 'folder', files: [], id };
          if (!item.uploadTime || item.uploadTime < uploadTime) item.uploadTime = uploadTime;
          filePointer.files?.push(item);
          filePointer = item;
        }
      }
      if (type === 'folder') filePointer.files?.push({ name: path[path.length - 1], type, files: [], id });
      else filePointer.files?.push({ name: path[path.length - 1], type, size, digest, uploadTime, id, start, end });
    });
    return cacheRoot.files;
  }
  else if (config.files) {
    (function addID(files: FileItem[]): void {
      files.forEach(file => {
        file.id = getID();
        if (file.files) addID(file.files);
      });
    })(config.files);
    return config.files;
  }
  else throw 'loadConfigFailed';
}

function stringifyConfig(config: FileItem[], layers: Manifest[] = []): {
  configString: string;
  manifestString: string;
  digest: string;
} {
  const layersSet: Set<string> = new Set();
  (function removeID(files: FileItem[]): void {
    files.forEach(file => {
      /*@ts-ignore*/
      delete file.id;
      if (file.files) removeID(file.files);
      else layersSet.add(`${file.digest}|${file.size}`);
    });
  })(config);
  if (layers.length === 0) {
    layers.push(...Array.from(layersSet).map(file => {
      const [digest, size] = file.split('|');
      return {
        mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip',
        digest, size: Number(size)
      };
    }));
  }
  const configString = JSON.stringify({ files: config });
  const digest = `sha256:${CryptoJS.SHA256(configString)}`;
  const manifest = {
    schemaVersion: 2,
    mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
    config: {
      mediaType: 'application/vnd.docker.container.image.v1+json',
      size: configString.length,
      digest
    },
    layers
  };
  return { configString, manifestString: JSON.stringify(manifest), digest };
}

function parseDatabaseConfig(array: DatabaseItem[]): FileItem[] {
  const mark = {};
  const root: FileItem[] = [];
  array.forEach(item => {
    item.id = getID();
    if (item.type === 'folder') {
      /*@ts-ignore*/
      mark[item.uuid] = item;
      item.files = [];
    }
  });
  array.forEach(item => {
    const [parent] = item._id?.split(':') as string[];
    if (parent === 'root') root.push(item);
    /*@ts-ignore*/
    else mark[parent].files.push(item);
  });
  return root;
}

registerPromiseWorker(({ configString, config, database, layers }) => {
  if (configString) {
    return parseConfig(configString);
  }
  else if (config) {
    return stringifyConfig(config, layers);
  }
  else if (database) {
    return parseDatabaseConfig(database);
  }
  else throw 'internalError';
});

export default {} as typeof Worker & { new(): Worker };