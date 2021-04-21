import axios, { AxiosError, AxiosInstance, AxiosResponse, CancelTokenSource, AxiosPromise, AxiosRequestConfig } from 'axios';
import CryptoJS from 'crypto-js';
import { Repository, FileItem, Manifest } from '@/utils/types';
import storage from '@/utils/storage';
import PromiseWorker from 'promise-worker';

interface Aria2RequestBody {
  jsonrpc: string;
  method: string;
  id: string;
  params: (string | [string] | object)[];
}

interface AxiosRequestConfigExtend extends AxiosRequestConfig {
  __retryCount?: number;
}

const preset = {
  retry: 3,
  timeout: 10000
};

function errorHandler(error: AxiosError): AxiosPromise {
  const config = error.config as AxiosRequestConfigExtend;
  if (!config || [401, 404].some(status => error.response?.status === status)) return Promise.reject(error);
  config.__retryCount = config.__retryCount ?? 0;
  if (config.__retryCount >= preset.retry) return Promise.reject(error);
  config.__retryCount += 1;
  return axios(config);
}

axios.defaults.timeout = preset.timeout;
axios.interceptors.response.use(undefined, errorHandler);

export default {
  async requestSender(url: string, instance: AxiosInstance, repository: Repository): Promise<AxiosResponse> {
    if (repository.token) instance.defaults.headers.common['Authorization'] = `Bearer ${repository.token}`;
    instance.interceptors.response.use(undefined, errorHandler);
    try {
      return await instance.request({ url });
    }
    catch (error) {
      const { status, headers } = error.response ?? {};
      if (status === 401) {
        try {
          const token = await this.getToken(headers['www-authenticate'], repository);
          if (token) {
            repository.token = token;
            instance.defaults.headers.common['Authorization'] = `Bearer ${repository.token}`;
          }
          else throw 'getTokenFailed';
          return await instance.request({ url });
        }
        catch (error) {
          const { status, headers } = error.response ?? {};
          if (status === 401) throw { message: 'need login', authenticateHeader: headers['www-authenticate'] };
          else throw error;
        }
      }
      throw error;
    }
  },
  async getToken(authenticateHeader: string, repository: Repository): Promise<string | undefined> {
    if (!authenticateHeader) throw 'getTokenFailed';
    const [, realm, service, , scope] = authenticateHeader?.match(/^Bearer realm="([^"]*)",service="([^"]*)"(,scope="([^"]*)"|)/) ?? [];
    if (realm && service) {
      let authenticateURL = `${realm}?service=${service}`;
      if (scope) authenticateURL += `&scope=${scope}`;
      const headers: { 'Authorization'?: string } = {};
      if (repository.secret) headers['Authorization'] = `Basic ${repository.secret}`;
      const { data } = await axios.get(authenticateURL, { headers, timeout: 5000 });
      return data.token;
    }
    else throw 'getTokenFailed';
  },
  async getManifests(repository: Repository): Promise<{ config: { files?: FileItem[]; fileItems?: FileItem[] }; layers: Manifest[] }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const manifestsURL = `https://${server}/v2/${namespace}/${image}/manifests/latest`;
    const manifestsInstance = axios.create({
      method: 'get',
      headers: {
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        'repository': [server, namespace, image].join('/')
      }
    });
    try {
      const { data } = await this.requestSender(manifestsURL, manifestsInstance, repository);
      const layers = data?.layers;
      const digest: string = data?.config?.digest;
      if (digest && layers) {
        const configDownloadURL = await this.getDownloadURL(digest, repository);
        const { data } = await axios.get(configDownloadURL);
        if (data) return { config: data, layers };
        else throw 'loadConfigFailed';
      }
      else throw 'loadConfigFailed';
    }
    catch (error) {
      const { status } = error.response ?? {};
      if (status === 404) return { config: { files: [] }, layers: [] };
      else throw error;
    }
  },
  parseConfig(config: { fileItems?: FileItem[]; files?: FileItem[] }): FileItem[] {
    let list!: FileItem[];
    if (config.fileItems) {
      const cacheRoot = { name: 'root', type: 'folder', files: [], id: Symbol() };
      config.fileItems.forEach(({ name: pathString, size, digest, uploadTime }) => {
        if (!uploadTime) uploadTime = Date.now();
        const path = pathString.substr(1).split('/');
        const type = digest ? 'file' : 'folder';
        let filePointer: FileItem = cacheRoot;
        const id = Symbol();
        for (let i = 0; i < path.length - 1; i++) {
          const nextPointer = filePointer.files?.find(e => e.name === path[i]);
          const id = Symbol();
          if (nextPointer) filePointer = nextPointer;
          else {
            const item: FileItem = { name: path[i], type: 'folder', files: [], id };
            if (!item.uploadTime || item.uploadTime < uploadTime) item.uploadTime = uploadTime;
            filePointer.files?.push(item);
            filePointer = item;
          }
        }
        if (type === 'folder') filePointer.files?.push({ name: path[path.length - 1], type, files: [], id });
        else filePointer.files?.push({ name: path[path.length - 1], type, size, digest, uploadTime, id });
      });
      list = cacheRoot.files;
    }
    else if (config.files) {
      const addID = (files: FileItem[]): void => {
        files.forEach(file => {
          file.id = Symbol();
          if (file.files) addID(file.files);
        });
      };
      addID(config.files);
      list = config.files;
    }
    else throw 'loadConfigFailed';
    return list;
  },
  async getDownloadURL(digest: string, repository: Repository): Promise<string> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    let downloadURL = '';
    const url = `https://${server}/v2/${namespace}/${image}/blobs/${digest}`;
    const request = axios.CancelToken.source();
    const instance = axios.create({
      method: 'get',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
      cancelToken: request.token
    });
    const getHeader = (e: chrome.webRequest.WebResponseHeadersDetails): void | chrome.webRequest.WebResponseHeadersDetails => {
      if (e.statusCode >= 300 && e.statusCode < 400) {
        downloadURL = e.responseHeaders?.find(e => e.name.toLowerCase() === 'location')?.value as string;
        request.cancel('ok');
      }
      else if (e.statusCode === 401) return e;
      else throw 'unknownError';
    };
    try {
      chrome.webRequest.onHeadersReceived.addListener(getHeader, { urls: [url] }, ['blocking', 'responseHeaders']);
      await this.requestSender(url, instance, repository);
      throw 'unknownError';
    }
    catch (error) {
      chrome.webRequest.onHeadersReceived.removeListener(getHeader);
      if (error.message === 'ok') return downloadURL;
      else {
        request.cancel();
        throw error;
      }
    }
  },
  async downloadFile(digest: string, repository: Repository): Promise<AxiosResponse> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const url = `https://${server}/v2/${namespace}/${image}/blobs/${digest}`;
    const instance = axios.create({
      method: 'get',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
      timeout: 0
    });
    return await this.requestSender(url, instance, repository);
  },
  async sentToAria2(items: { name: string; digest: string }[], repository: Repository): Promise<{ success: number; fail: number }> {
    const { aria2 } = await storage.getValue('aria2');
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const requestBody: Aria2RequestBody[] = [];
    const timestamp = Date.now();
    const address = aria2?.address ? aria2.address : 'http://localhost:6800/jsonrpc';
    const secret = aria2?.secret ? [`token:${aria2.secret}`] : [];
    items.forEach((item, i) => requestBody.push({
      jsonrpc: '2.0',
      method: 'aria2.addUri',
      id: `${timestamp}${i}`,
      params: [...secret, [`https://${server}/v2/${namespace}/${image}/blobs/${item.digest}`], {
        'out': `${item.name}`,
        'header': [`repository: ${repository.url}`, `Authorization: Bearer ${repository.token}`]
      }]
    }));
    await this.getUploadURL(repository);
    const { data } = await axios.post(`${address}?tm=${timestamp}`, JSON.stringify(requestBody), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });
    const fail = data.reduce((s: number, i: { error: object }) => i.error ? s + 1 : s, 0);
    return { success: items.length - fail, fail };
  },
  async getUploadURL(repository: Repository): Promise<string> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const instance = axios.create({
      method: 'post',
      headers: {
        'repository': [server, namespace, image].join('/')
      }
    });
    const url = `https://${server}/v2/${namespace}/${image}/blobs/uploads/`;
    const { headers } = await this.requestSender(url, instance, repository);
    if (headers['location']) return headers['location'] as string;
    else throw 'getUploadURLFailed';
  },
  async uploadConfig(config: string, repository: Repository): Promise<{ digest: string; size: number }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const size = config.length;
    const digest = `sha256:${CryptoJS.SHA256(config)}`;
    const url = await this.getUploadURL(repository);
    const instance = axios.create({
      method: 'put',
      headers: {
        'Content-Type': 'application/octet-stream',
        'repository': [server, namespace, image].join('/')
      },
      timeout: 0
    });
    instance.interceptors.request.use(e => Object.assign(e, {
      data: new Blob([config], { type: 'application/octet-stream' })
    }));
    await this.requestSender(`${url}&digest=${digest}`, instance, repository);
    return { digest, size };
  },
  async uploadFile(file: File, repository: Repository, onUploadProgress: (progressEvent: ProgressEvent) => void, cancelToken: CancelTokenSource, hashWorker: Worker): Promise<{ digest: string; size: number }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const size = file.size;
    const url = await this.getUploadURL(repository);
    const patchInstance = axios.create({
      method: 'patch',
      headers: {
        'Content-Type': 'application/octet-stream',
        'repository': [server, namespace, image].join('/')
      },
      onUploadProgress,
      cancelToken: cancelToken.token,
      timeout: 0
    });
    patchInstance.interceptors.request.use(e => Object.assign(e, {
      data: new Blob([file], { type: 'application/octet-stream' })
    }));
    const [{ headers }, digest] = await Promise.all([this.requestSender(`${url}`, patchInstance, repository), this.hashFile(file, hashWorker)]);
    // const { headers } = await this.requestSender(`${url}`, patchInstance, repository);
    // const digest = await this.hashFile(file, hashWorker);
    const instance = axios.create({
      method: 'put',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
      cancelToken: cancelToken.token,
      timeout: 0
    });
    await this.requestSender(`${headers['location']}&digest=${digest}`, instance, repository);
    return { digest, size };
  },
  async removeFile(digest: string, repository: Repository): Promise<void> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const url = `https://${server}/v2/${namespace}/${image}/blobs/${digest}`;
    const instance = axios.create({
      method: 'delete',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
    });
    await this.requestSender(url, instance, repository);
  },
  async commit(config: { files: FileItem[]; layers: Manifest[] }, repository: Repository): Promise<void> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const { digest, size } = await this.uploadConfig(JSON.stringify({ files: config.files }), repository);
    const manifest = {
      schemaVersion: 2,
      mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
      config: {
        mediaType: 'application/vnd.docker.container.image.v1+json',
        size,
        digest
      },
      layers: config.layers
    };
    const url = `https://${server}/v2/${namespace}/${image}/manifests/latest`;
    const instance = axios.create({
      method: 'put',
      headers: {
        'Content-Type': 'application/vnd.docker.distribution.manifest.v2+json',
        'repository': [server, namespace, image].join('/')
      },
    });
    instance.interceptors.request.use(e => Object.assign(e, {
      data: JSON.stringify(manifest)
    }));
    await this.requestSender(url, instance, repository);
  },
  async hashFile(file: File, worker: Worker): Promise<string> {
    const promiseWorker = new PromiseWorker(worker);
    const hash = await promiseWorker.postMessage({ file });
    worker.terminate();
    return hash;
  }
};