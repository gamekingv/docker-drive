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
  parent?: string | null;
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
      client.defaults.headers.common['Authorization'] = `Bearer ${repository.databaseToken.token}`;
    }
  },
  async treeToArray(items: DatabaseItem[], parent: string | null, repository: Repository): Promise<void> {
    for (const item of items) {
      const files = item.files;
      delete item.files;
      delete item._id;
      const id = await this.update(item, parent, repository);
      if (files) await this.treeToArray(files, id, repository);
    }
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
    await client.put(`${repository.databaseURL}/${databaseName}`);
    await client.post(`${repository.databaseURL}/${databaseName}/_index`, {
      'ddoc': 'uploadTime',
      'index': {
        'fields': [{ 'uploadTime': 'asc' }]
      },
      'name': 'getItemByUploadTime',
      'type': 'json'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    await client.post(`${repository.databaseURL}/${databaseName}/_index`, {
      'ddoc': 'parent',
      'index': {
        'fields': [{ 'parent': 'asc' }]
      },
      'name': 'getItemByParent',
      'type': 'json'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    await client.post(`${repository.databaseURL}/${databaseName}/_index`, {
      'ddoc': 'parent_and_name',
      'index': {
        'fields': [{ 'parent': 'asc' }, { 'name': 'asc' }]
      },
      'name': 'getItemByParentAndName',
      'type': 'json'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (files) await this.treeToArray(files, null, repository);
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
      'selector': { '_id': { '$gt': '0' } },
      'fields': ['_id', 'name', 'parent', 'type', 'digest', 'size', 'uploadTime'],
      'sort': [{ 'uploadTime': 'asc' }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return this.parse(data.docs);
  },
  async search(name: string, parent: string | null, repository: Repository): Promise<FileItem[]> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    const { data } = await client.post(`${repository.databaseURL}/${databaseName}/_find`, {
      'selector': {
        'parent': { '$eq': parent },
        'name': { '$eq': name }
      },
      'fields': ['_id', 'name', 'parent', 'type', 'digest', 'size', 'uploadTime']
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return data.docs;
  },
  async update(item: DatabaseItem, parent: string | null, repository: Repository): Promise<string> {
    await this.setToken(repository);
    const databaseName = repository.url.replaceAll('/', '-').replaceAll('.', '_');
    delete item.files;
    item.parent = parent;
    if (item._id) {
      try {
        const { headers } = await client.head(`${repository.databaseURL}/${databaseName}/${item._id}`);
        if (headers['etag']) item._rev = headers['etag'].replaceAll('"', '');
        else throw '';
      }
      catch (error) {
        throw `"${item.name}" doesn't exist`;
      }
    }
    const { data } = await client.post(`${repository.databaseURL}/${databaseName}`, item, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return data.id;
  },
  async rename(item: FileItem, parent: string | null, repository: Repository): Promise<void> {
    const [databaseItem] = await this.search(item.name, parent, repository);
    if (databaseItem) throw 'duplicate';
    await this.update(item, parent, repository);
  },
  async move(items: FileItem[], to: string | null, repository: Repository): Promise<number> {
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
    }, null);
    if (item.type === 'folder') {
      await this.update(item, id, repository);
    }
    else {
      let [file] = await this.search(item.name, id, repository);
      if (file && file.digest === item.digest) return;
      let finalName = item.name, index = 0;
      let [, name, ext] = item.name.match(/(.*)(\.[^.]*)$/) || [];
      if (!name) {
        name = item.name;
        ext = '';
      }
      while (([file] = await this.search(item.name, id, repository)).length > 0) {
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
      mark[item._id] = item;
      item.id = Symbol();
      if (item.type === 'folder') item.files = [];
    });
    array.forEach(item => {
      if (item.parent === null) root.push(item);
      /*@ts-ignore*/
      else mark[item.parent].files.push(item);
      delete item.parent;
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