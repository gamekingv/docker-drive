import axios, { AxiosInstance, AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';
import { Repository, FileItem, Manifest } from '@/utils/types';
import PromiseWorker from 'promise-worker';
import hashWorker from '@/utils/hash.worker';

export default {
  async requestSender(url: string, instance: AxiosInstance, repository: Repository): Promise<AxiosResponse> {
    if (repository.token) instance.defaults.headers.common['Authorization'] = `Bearer ${repository.token}`;
    try {
      return await instance.request({ url });
    }
    catch (error) {
      if (error.response) {
        const { status, headers } = error.response;
        if (status === 401) {
          const token = await this.getToken(headers['www-authenticate'], repository);
          if (token) {
            repository.token = token;
            instance.defaults.headers.common['Authorization'] = `Bearer ${repository.token}`;
            try {
              return await instance.request({ url });
            }
            catch (error) {
              const { status, headers } = error.response;
              if (status === 401) throw { message: 'need login', authenticateHeader: headers['www-authenticate'] };
              else throw error;
            }
          }
          else throw 'getTokenFailed';
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
      },
      timeout: 30000
    });
    const { data } = await this.requestSender(manifestsURL, manifestsInstance, repository);
    const layers = data?.layers;
    const digest: string = data?.config?.digest;
    if (digest && layers) {
      const configURL = `https://${server}/v2/${namespace}/${image}/blobs/${digest}`;
      const configInstance = axios.create({
        method: 'get',
        headers: {
          'repository': [server, namespace, image].join('/')
        },
        timeout: 30000
      });
      const { data } = await this.requestSender(configURL, configInstance, repository);
      if (data) return { config: data, layers };
      else throw 'loadConfigFailed';
    }
    else throw 'loadConfigFailed';
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
      cancelToken: request.token,
      timeout: 10000,
      onDownloadProgress: (e) => {
        downloadURL = e.currentTarget.responseURL;
        request.cancel('cancel');
      }
    });
    try {
      await this.requestSender(url, instance, repository);
      throw 'unknownError';
    }
    catch (error) {
      if (error.message === 'cancel') return downloadURL;
      else throw error;
    }
  },
  async getUploadURL(repository: Repository): Promise<string> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const instance = axios.create({
      method: 'post',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
      timeout: 10000
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
      timeout: 30000
    });
    instance.interceptors.request.use(e => {
      e.data = new Blob([config], { type: 'application/octet-stream' });
      return e;
    });
    await this.requestSender(`${url}&digest=${digest}`, instance, repository);
    return { digest, size };
  },
  async uploadFile(file: File, repository: Repository, onUploadProgress: (progressEvent: ProgressEvent) => void): Promise<{ digest: string; size: number }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const size = file.size;
    const url = await this.getUploadURL(repository);
    const patchInstance = axios.create({
      method: 'patch',
      headers: {
        'Content-Type': 'application/octet-stream',
        'repository': [server, namespace, image].join('/')
      },
      onUploadProgress
    });
    patchInstance.interceptors.request.use(e => {
      e.data = new Blob([file], { type: 'application/octet-stream' });
      return e;
    });
    const [{ headers }, digest] = await Promise.all([this.requestSender(`${url}`, patchInstance, repository), this.hashFile(file)]);
    const instance = axios.create({
      method: 'put',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
      timeout: 10000
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
      timeout: 10000
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
      timeout: 10000
    });
    instance.interceptors.request.use(e => {
      e.data = JSON.stringify(manifest);
      return e;
    });
    await this.requestSender(url, instance, repository);
  },
  async hashFile(file: File): Promise<string> {
    const worker = new hashWorker();
    const promiseWorker = new PromiseWorker(worker);
    const hash = await promiseWorker.postMessage({ file });
    worker.terminate();
    return hash;
  }
};