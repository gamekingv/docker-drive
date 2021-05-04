import axios, { AxiosError, AxiosPromise, AxiosRequestConfig } from 'axios';
import { Repository, FileItem, Manifest } from '@/utils/types';

interface AxiosRequestConfigExtend extends AxiosRequestConfig {
  __retryCount?: number;
}

interface Config {
  files: FileItem[];
  layers: Manifest[];
}

interface DatabaseItem extends FileItem {
  parent?: string;
}

const preset = {
  retry: 3,
  timeout: 60000
};

function errorHandler(error: AxiosError): AxiosPromise {
  const config = error.config as AxiosRequestConfigExtend;
  if (!config || [403].some(status => error.response?.status === status)) {
    if (error.response?.status === 403) return Promise.reject(error.response?.data?.message);
    else return Promise.reject(error);
  }
  if (/\/add\?/.test(config.url as string)) Promise.reject(error);
  config.__retryCount = config.__retryCount ?? 0;
  if (config.__retryCount >= preset.retry) return Promise.reject(error);
  config.__retryCount += 1;
  return axios(config);
}

const client = axios.create({
  timeout: preset.timeout
});

client.interceptors.response.use(undefined, errorHandler);

export default {
  async initialize(files: FileItem[], repository: Repository): Promise<Config> {
    const { data } = await client.post(`${repository.databaseURL}`,
      { files },
      {
        params: { repository: repository.url, list: 1, action: 'initialize' },
        timeout: 0
      }
    );
    return this.parse(data.config);
  },
  async check(repository: Repository): Promise<boolean> {
    const { data } = await client.get(`${repository.databaseURL}`,
      { params: { repository: repository.url, action: 'check' } }
    );
    return data?.result;
  },
  async synchronize(repository: Repository): Promise<Config> {
    const { data } = await client.get(`${repository.databaseURL}`,
      { params: { repository: repository.url, action: 'synchronize' } }
    );
    // return this.parse(data.config);
    return { files: [], layers: [] };
  },
  async list(repository: Repository): Promise<Config> {
    const { data } = await client.get(`${repository.databaseURL}`,
      { params: { repository: repository.url, action: 'list' } }
    );
    // return this.parse(data.config);
    return { files: [], layers: [] };
  },
  async rename(id: string, newName: string, repository: Repository): Promise<Config> {
    const { data } = await client.post(`${repository.databaseURL}`,
      { id, newName },
      { params: { repository: repository.url, list: 1, action: 'rename' } }
    );
    // return this.parse(data.config);
    return { files: [], layers: [] };
  },
  async move(ids: string[], to: string | null, repository: Repository): Promise<Config> {
    const { data } = await client.post(`${repository.databaseURL}`,
      { ids, to },
      { params: { repository: repository.url, list: 1, action: 'move' } }
    );
    // return this.parse(data.config);
    return { files: [], layers: [] };
  },
  async remove(files: FileItem[], repository: Repository): Promise<Config> {
    const { data } = await client.post(`${repository.databaseURL}`,
      { files },
      { params: { repository: repository.url, list: 1, action: 'remove' } },
    );
    // return this.parse(data.config);
    return { files: [], layers: [] };
  },
  async add(files: { paths: string[]; item: FileItem }[], repository: Repository, list = 1): Promise<Config> {
    const { data } = await client.post(`${repository.databaseURL}`,
      { files },
      { params: { repository: repository.url, list, action: 'add' } }
    );
    // if (list === 1) return this.parse(data.config);
    // else return { files: [], layers: [] };
    return { files: [], layers: [] };
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