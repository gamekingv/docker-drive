import axios, { AxiosInstance, AxiosResponse } from 'axios';
import CryptoJS from 'crypto-js';
import { Repository, FileItem, Manifest } from '@/utils/types';

export default {
  async requestSender(url: string, instance: AxiosInstance, repository: Repository): Promise<AxiosResponse> {
    //instance.defaults.timeout = 30000;
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
  async getManifests(repository: Repository): Promise<{ config: { files?: FileItem; fileItems?: FileItem[] }; layers: Manifest[] }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const manifestsURL = `https://${server}/v2/${namespace}/${image}/manifests/latest`;
    const manifestsInstance = axios.create({
      method: 'get',
      headers: {
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        'repository': [server, namespace, image].join('/')
      }
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
        timeout: 10000
      });
      const { data } = await this.requestSender(configURL, configInstance, repository);
      if (data) return { config: data, layers };
      else throw 'loadConfigFailed';
    }
    else throw 'loadConfigFailed';
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
      timeout: 5000
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
      timeout: 10000
    });
    instance.interceptors.request.use(e => {
      e.data = new Blob([config], { type: 'application/octet-stream' });
      return e;
    });
    await this.requestSender(`${url}&digest=${digest}`, instance, repository);
    return { digest, size };
  },
  async uploadFile(file: File, repository: Repository, onUploadProgress: Function): Promise<{ digest: string; size: number }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const size = file.size;
    const digest = `sha256:${await this.hashFile(file)}`;
    const url = await this.getUploadURL(repository);
    const instance = axios.create({
      method: 'post',
      headers: {
        'Content-Type': 'application/octet-stream',
        'repository': [server, namespace, image].join('/')
      },
      timeout: 0,
      onUploadProgress: e => onUploadProgress(e)
    });
    instance.interceptors.request.use(e => {
      e.data = new Blob([file], { type: 'application/octet-stream' });
      return e;
    });

    function modifyHeader(details: chrome.webRequest.WebRequestHeadersDetails): chrome.webRequest.BlockingResponse {
      if (details.requestHeaders)
        for (let i = 0; i < details.requestHeaders.length; ++i) {
          if (details.requestHeaders[i].name === 'User-Agent') {
            details.requestHeaders[i].value = 'Docker-Client/19.03.8-ce (linux)';
            break;
          }
        }
      return { requestHeaders: details.requestHeaders };
    }
    chrome.webRequest.onBeforeSendHeaders.addListener(modifyHeader,
      { urls: [url] },
      ['blocking', 'requestHeaders']
    );

    const { headers } = await this.requestSender(url, instance, repository);
    chrome.webRequest.onBeforeSendHeaders.removeListener(modifyHeader);
    const checkInstance = axios.create({
      method: 'put',
      headers: {
        'repository': [server, namespace, image].join('/')
      },
      timeout: 5000,
      onUploadProgress: e => onUploadProgress(e)
    });
    await this.requestSender(`${headers['location']}&digest=${digest}`, checkInstance, repository);

    return { digest, size };
  },
  async commit(config: { files: FileItem; layers: Manifest[] }, repository: Repository): Promise<void> {
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
    return new Promise((res, rej) => {
      let currentChunk = 0;
      let reader: FileReader | null = new FileReader();
      const contractFile = file;
      const blobSlice = File.prototype.slice;
      const chunkSize = 6 * 1024 * 1024;
      const chunks = Math.ceil(contractFile.size / chunkSize);
      const SHA256 = CryptoJS.algo.SHA256.create();
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= contractFile.size ? contractFile.size : start + chunkSize;
      reader.readAsArrayBuffer(blobSlice.call(contractFile, start, end));
      reader.onload = function (e): void {
        if (!e.target?.result) return rej(e);
        const i8a = new Uint8Array(e.target.result as ArrayBuffer);
        const a = [];
        for (let i = 0; i < i8a.length; i += 4) {
          a.push(i8a[i] << 24 | i8a[i + 1] << 16 | i8a[i + 2] << 8 | i8a[i + 3]);
        }
        SHA256.update(CryptoJS.lib.WordArray.create(a, i8a.length));
        currentChunk += 1;
        if (currentChunk < chunks) {
          const start = currentChunk * chunkSize;
          const end = start + chunkSize >= contractFile.size ? contractFile.size : start + chunkSize;
          reader?.readAsArrayBuffer(blobSlice.call(contractFile, start, end));
        }
      };
      reader.onloadend = (): void => {
        res(SHA256.finalize().toString());
        reader = null;
      };
      reader.onerror = rej;
    });
  }
};