import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Repository, FileItem, Manifest } from '@/utils/types';
import qs from 'qs';

interface AxiosRequestConfigExtend extends AxiosRequestConfig {
  __retryCount?: number;
}

interface Config {
  files: FileItem[];
  layers: Manifest[];
}

interface DatabaseItem extends FileItem {
  _rev?: string;
}

const preset = {
  retry: 3,
  timeout: 60000
};

async function errorHandler(error: AxiosError): Promise<AxiosResponse> {
  const config = error.config as AxiosRequestConfigExtend;
  if (!config || [401, 404].some(status => error.response?.status === status)) {
    if (error.response?.status === 401) return await Promise.reject(error.response?.data?.message);
    else return await Promise.reject(error);
  }
  config.__retryCount = config.__retryCount ?? 0;
  if (config.__retryCount >= preset.retry) return await Promise.reject(error);
  config.__retryCount += 1;
  await new Promise(res => setTimeout(() => res(''), 1000));
  return await axios(config);
}

const client = axios.create({
  timeout: preset.timeout
});

client.interceptors.response.use(undefined, errorHandler);

export default {
  async getToken(secret: string): Promise<{ token: string; expiration: number }> {
    const { data } = await axios.post('https://iam.cloud.ibm.com/identity/token', qs.stringify({
      'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
      'apikey': secret
    }), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return { token: data.access_token, expiration: data.expiration };
  },
  async setToken(repository: Repository): Promise<void> {
    if (!repository.databaseToken) return;
    const now = Date.now() / 1000;
    if (now >= repository.databaseToken.expiration - 60) {
      const { token, expiration } = await this.getToken(repository.databaseToken.apikey);
      repository.databaseToken.token = token;
      repository.databaseToken.expiration = expiration;
    }
    client.defaults.headers.common['Authorization'] = `Bearer ${repository.databaseToken.token}`;
  },
  async initialize(files: FileItem[], repository: Repository): Promise<void> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    try {
      await client.head(`${repository.databaseURL}/${databaseName}`);
      await client.delete(`${repository.databaseURL}/${databaseName}`);
    }
    catch (error) {
      if (error.response.status !== 404) throw error;
    }
    await client.put(`${repository.databaseURL}/${databaseName}?partitioned=true`);
    const docs: DatabaseItem[] = [], uuids: string[] = [];
    const count = (function getCount(files: FileItem[]): number {
      return files.reduce((count, file) => {
        count++;
        if (file.type === 'folder') count += getCount(file.files as FileItem[]);
        return count;
      }, 0);
    })(files);
    while (uuids.length < count) {
      const { data } = await client.get(`${repository.databaseURL}/_uuids`, {
        params: {
          count: count - uuids.length <= 1000 ? count - uuids.length : 1000
        }
      });
      uuids.push(...data.uuids);
    }
    await client.post(`${repository.databaseURL}/${databaseName}/_index`, {
      ddoc: 'name',
      index: {
        fields: [{ name: 'asc' }]
      },
      name: 'getItemByName',
      type: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    await client.post(`${repository.databaseURL}/${databaseName}/_index`, {
      ddoc: 'uploadTime',
      index: {
        fields: [{ uploadTime: 'desc' }]
      },
      name: 'getItemByUploadTime',
      type: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    await client.post(`${repository.databaseURL}/${databaseName}/_index`, {
      ddoc: 'global',
      index: {
        fields: [{ uploadTime: 'desc' }]
      },
      name: 'getItemGlobal',
      type: 'json',
      partitioned: false
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    (function toArray(files: DatabaseItem[], parent: string): void {
      files.forEach(file => {
        const uuid = uuids.pop() as string;
        file._id = `${parent}:${uuid}`;
        file.uuid = uuid;
        if (file.files) {
          toArray(file.files, uuid);
          delete file.files;
        }
        docs.push(file);
      });
    })(files, 'root');
    await client.post(`${repository.databaseURL}/${databaseName}/_bulk_docs`, {
      docs
    }, { timeout: 0 });
  },
  async check(repository: Repository): Promise<boolean> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    try {
      await client.head(`${repository.databaseURL}/${databaseName}`);
    }
    catch (error) {
      return false;
    }
    return true;
  },
  async list(repository: Repository): Promise<Config> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    const { data } = await client.post(`${repository.databaseURL}/${databaseName}/_find`, {
      selector: { _id: { $gt: '0' } },
      fields: ['_id', 'name', 'uuid', 'type', 'digest', 'size', 'uploadTime'],
      sort: [{ uploadTime: 'desc' }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return this.parse(data.docs);
  },
  async search(name: string, parent: string, repository: Repository): Promise<FileItem[]> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    const { data } = await client.post(`${repository.databaseURL}/${databaseName}/_partition/${parent}/_find`, {
      selector: {
        name: { $eq: name }
      },
      fields: ['_id', 'name', 'uuid', 'type', 'digest', 'size', 'uploadTime']
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return data.docs;
  },
  async update(item: DatabaseItem, parent: string, repository: Repository): Promise<string> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    delete item.files;
    if (item._id) {
      try {
        if (item._id.split(':')[0] !== parent) {
          await this.remove(item._id, repository);
          item._id = `${parent}:${item.uuid}`;
        }
        else {
          const { headers } = await client.head(`${repository.databaseURL}/${databaseName}/${item._id}`);
          if (headers['etag']) item._rev = headers['etag'].replaceAll('"', '');
          else throw '';
        }
      }
      catch (error) {
        throw `"${item.name}" doesn't exist`;
      }
    }
    else {
      const { data } = await client.get(`${repository.databaseURL}/_uuids`);
      item.uuid = data.uuids[0];
      item._id = `${parent}:${item.uuid}`;
    }
    const { data } = await client.post(`${repository.databaseURL}/${databaseName}`, item, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return data.id.split(':')[1];
  },
  async rename(item: FileItem, parent: string, repository: Repository): Promise<void> {
    const [databaseItem] = await this.search(item.name, parent, repository);
    if (databaseItem) throw 'duplicate';
    await this.update(item, parent, repository);
  },
  async move(items: FileItem[], to: string, repository: Repository): Promise<number> {
    let duplicate = 0;
    for (const item of items) {
      const [databaseItem] = await this.search(item.name, to, repository);
      if (databaseItem) {
        duplicate++;
        continue;
      }
      await this.update(item, to, repository);
    }
    return duplicate;
  },
  async remove(id: string, repository: Repository): Promise<void> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    const { headers } = await client.head(`${repository.databaseURL}/${databaseName}/${id}`);
    await client.delete(`${repository.databaseURL}/${databaseName}/${id}?rev=${headers['etag'].replaceAll('"', '')}`);
  },
  async add(paths: string[], item: FileItem, repository: Repository): Promise<void> {
    /*@ts-ignore*/
    const id = await paths.reduce(async (parentId, path) => {
      const [folder] = await this.search(path, await parentId, repository);
      if (folder) {
        folder.uploadTime = item.uploadTime;
        return await this.update(folder, await parentId, repository);
      }
      else return await this.update({
        id: Symbol(),
        name: path,
        type: 'folder',
        uploadTime: item.uploadTime
      }, await parentId, repository);
    }, 'root');
    if (item.type === 'folder') {
      await this.update(item, id, repository);
    }
    else {
      let finalName = item.name, index = 0, file;
      let [, name, ext] = item.name.match(/(.*)(\.[^.]*)$/) || [];
      if (!name) {
        name = item.name;
        ext = '';
      }
      while (([file] = await this.search(finalName, id, repository)).length > 0) {
        if (file && file.digest === item.digest) return;
        finalName = `${name} (${++index})${ext}`;
      }
      await this.update(Object.assign(item, { name: finalName }), id, repository);
    }
  },
  parse(array: DatabaseItem[]): Config {
    const mark = {};
    const root: FileItem[] = [];
    array.forEach(item => {
      /*@ts-ignore*/
      mark[item.uuid] = item;
      item.id = Symbol();
      if (item.type === 'folder') item.files = [];
    });
    array.forEach(item => {
      const [parent] = item._id?.split(':') as string[];
      if (parent === 'root') root.push(item);
      /*@ts-ignore*/
      else mark[parent].files.push(item);
    });
    const files: Set<string> = new Set();
    array.forEach(item => item.type === 'file' ? files.add(`${item.digest}|${item.size}`) : '');
    const layers = Array.from(files).map(file => {
      const [digest, size] = file.split('|');
      return {
        mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip',
        digest, size: Number(size)
      };
    });
    return { files: root, layers };
  }
};