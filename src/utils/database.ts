import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Repository, FileItem, Manifest } from '@/utils/types';
import qs from 'qs';
import CryptoJS from 'crypto-js';

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
  if (!config || [401, 404, 409].some(status => error.response?.status === status)) {
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
        if (file.type === 'folder') {
          count++;
          count += getCount(file.files as FileItem[]);
        }
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
        file._id = `${parent}:${CryptoJS.MD5(file.name)}`;
        if (file.files) {
          const uuid = uuids.pop() as string;
          file.uuid = uuid;
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
      fields: ['_id', 'name', 'type', 'digest', 'size', 'uploadTime', 'uuid'],
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
      fields: ['_id', 'name', 'type', 'digest', 'size', 'uploadTime', 'uuid']
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
      const [parentID, id] = item._id.split(':');
      const isModifyName = id !== `${CryptoJS.MD5(item.name)}`, isModifyParent = parentID !== parent;
      try {
        if (isModifyName || isModifyParent) {
          item._id = `${parent}:${CryptoJS.MD5(item.name)}`;
        } else {
          const { headers } = await client.head(`${repository.databaseURL}/${databaseName}/${item._id}`);
          if (headers['etag']) item._rev = headers['etag'].replace(/.*"([^"]+)".*/, '$1');
          else throw '';
        }
      }
      catch (error) {
        throw `"${item.name}" doesn't exist`;
      }
      try {
        const { data } = await client.post(`${repository.databaseURL}/${databaseName}`, item, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return item.type === 'file' ? data.id.split(':')[1] : item.uuid;
      }
      catch (error) {
        if (error.response) {
          if (error.response.status === 409 && error.response.data?.error === 'conflict') {
            if (!isModifyName && !isModifyParent) {
              const { headers } = await client.head(`${repository.databaseURL}/${databaseName}/${item._id}`);
              if (headers['etag']) item._rev = headers['etag'].replace(/.*"([^"]+)".*/, '$1');
              else throw error;
              const { data } = await client.post(`${repository.databaseURL}/${databaseName}`, item, {
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              return item.type === 'file' ? data.id.split(':')[1] : item.uuid;
            }
          }
        }
        throw error;
      }
    }
    else {
      if (item.type === 'folder') {
        const { data } = await client.get(`${repository.databaseURL}/_uuids`);
        item.uuid = data.uuids[0];
      }
      item._id = `${parent}:${CryptoJS.MD5(item.name)}`;
      try {
        const { data } = await client.post(`${repository.databaseURL}/${databaseName}`, item, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return item.type === 'file' ? data.id.split(':')[1] : item.uuid;
      }
      catch (error) {
        if (error.response?.status === 409 && error.response?.data?.error === 'conflict') {
          if (item.type === 'folder') return item.uuid as string;
          else {
            let finalName = item.name, finalId = item._id, index = 0, exist = true;
            let [, name, ext] = item.name.match(/(.*)(\.[^.]*)$/) || [];
            if (!name) {
              name = item.name;
              ext = '';
            }
            while (exist) {
              finalName = `${name} (${++index})${ext}`;
              try {
                const { data } = await client.get(`${repository.databaseURL}/${databaseName}/${finalId}`);
                if (data.digest === item.digest) throw 'fileExisted';
                finalId = `${parent}:${CryptoJS.MD5(finalName)}`;
                await client.post(`${repository.databaseURL}/${databaseName}`, Object.assign(item, { _id: finalId, name: finalName }), {
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                exist = false;
                return finalId.split(':')[1];
              }
              catch (error) {
                if (error.response?.status !== 409 || error.response?.data?.error !== 'conflict') throw error;
              }
            }
          }
        }
        throw error;
      }
    }
  },
  async rename(item: FileItem, parent: string, repository: Repository): Promise<void> {
    const oldId = item._id as string;
    await this.update(item, parent, repository);
    await this.remove(oldId, repository);
  },
  async move(items: FileItem[], to: string, repository: Repository): Promise<number> {
    let duplicate = 0;
    for (const item of items) {
      try {
        const oldId = item._id as string;
        await this.update(item, to, repository);
        await this.remove(oldId, repository);
      }
      catch (error) {
        duplicate++;
      }
    }
    return duplicate;
  },
  async remove(id: string, repository: Repository): Promise<void> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    const { headers } = await client.head(`${repository.databaseURL}/${databaseName}/${id}`);
    await client.delete(`${repository.databaseURL}/${databaseName}/${id}?rev=${headers['etag'].replace(/.*"([^"]+)".*/, '$1')}`);
  },
  async add(paths: string[], item: FileItem, repository: Repository): Promise<void> {
    /*@ts-ignore*/
    const parent = await paths.reduce(async (parentId, path) => {
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
    await this.update(item, parent, repository);
  },
  parse(array: DatabaseItem[]): Config {
    const mark = {};
    const root: FileItem[] = [];
    array.forEach(item => {
      item.id = Symbol();
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