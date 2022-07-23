import axios, { AxiosError, AxiosInstance, AxiosResponse, CancelTokenSource, AxiosPromise, AxiosRequestConfig } from 'axios';
import { Repository, FileItem, Manifest } from '@/utils/types';
import storage from '@/utils/storage';
import PromiseWorker from 'promise-worker';
import listWorker from '@/utils/list.worker';
import { buildAsExtension } from '@/build-type.json';
// import test from '../test-data.json';

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
  timeout: buildAsExtension ? 10000 : 60000
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
    const token = await storage.getRepositoryToken(repository.id);
    if (token) instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    instance.interceptors.response.use(undefined, errorHandler);
    try {
      return await instance.request({ url });
    }
    catch (error) {
      const { status, headers } = error.response ?? {};
      if (status === 401) {
        try {
          const newToken = await this.getToken(headers['www-authenticate'], repository);
          if (newToken) {
            await storage.setRepositoryToken(repository.id, newToken);
            instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
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
  async getManifests(repository: Repository): Promise<{ config: FileItem[]; layers: Manifest[] }> {
    // const worker = new listWorker();
    // const promiseWorker = new PromiseWorker(worker);
    // const config = await promiseWorker.postMessage({ configString: JSON.stringify(test) });
    // worker.terminate();
    // return { config, layers: [] };
    try {
      if (buildAsExtension) {
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
          const configDownloadURL = await this.getDownloadURL(digest, repository);
          const { data: configString } = await axios.get(configDownloadURL, {
            transformResponse: res => res,
            timeout: 30000
          });
          if (configString) {
            const worker = new listWorker();
            const promiseWorker = new PromiseWorker(worker);
            const config = await promiseWorker.postMessage({ configString });
            worker.terminate();
            return { config, layers };
          }
          else throw 'loadConfigFailed';
        }
        else throw 'loadConfigFailed';
      }
      else {
        const { data: configString } = await axios.get(`/api/manifests?repo=${repository.id}`, {
          transformResponse: res => res
        });
        if (configString) {
          const worker = new listWorker();
          const promiseWorker = new PromiseWorker(worker);
          const config = await promiseWorker.postMessage({ configString });
          worker.terminate();
          return { config, layers: [] };
        }
        else throw 'loadConfigFailed';
      }
    }
    catch (error) {
      const { status } = error.response ?? {};
      if (status === 404) return { config: [], layers: [] };
      else throw error;
    }
  },
  async getDownloadURL(digest: string, repository: Repository): Promise<string> {
    if (buildAsExtension) {
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
        else throw 'internalError';
      };
      try {
        chrome.webRequest.onHeadersReceived.addListener(getHeader, { urls: [url] }, ['blocking', 'responseHeaders']);
        await this.requestSender(url, instance, repository);
        throw 'internalError';
      }
      catch (error) {
        chrome.webRequest.onHeadersReceived.removeListener(getHeader);
        if (error?.message === 'ok') return downloadURL;
        else {
          request.cancel();
          throw error;
        }
      }
    }
    else {
      const { data: downloadUrl } = await axios.get(`/api/file/${digest.replace('sha256:', '')}?repo=${repository.id}`);
      return downloadUrl;
    }
  },
  async downloadFile(digest: string, repository: Repository): Promise<AxiosResponse> {
    if (buildAsExtension) {
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
    }
    else return await axios.get(`/api/file/${digest.replace('sha256:', '')}?type=download&repo=${repository.id}`);
  },
  async sentToAria2(items: { name: string; digest: string }[], repository: Repository): Promise<{ success: number; fail: number }> {
    const aria2 = await storage.getAria2Config();
    const { protocol, host } = location;
    const [server, namespace, image] = repository.url.split('/') ?? [];
    if (buildAsExtension) await this.getUploadURL(repository);
    let token: string | undefined;
    if (buildAsExtension) token = await storage.getRepositoryToken(repository.id);
    const requestBody: Aria2RequestBody[] = [];
    const timestamp = Date.now();
    const address = aria2?.address ? aria2.address : 'http://localhost:6800/jsonrpc';
    const secret = aria2?.secret ? [`token:${aria2.secret}`] : [];
    items.forEach((item, i) => requestBody.push({
      jsonrpc: '2.0',
      method: 'aria2.addUri',
      id: `${timestamp}${i}`,
      params: [...secret, [buildAsExtension ? `https://${server}/v2/${namespace}/${image}/blobs/${item.digest}` :
        `${protocol}//${host}/api/file/${item.digest.replace('sha256:', '')}?type=source&repo=${repository.id}`], {
        'out': `${item.name}`,
        'header': buildAsExtension ? [`repository: ${repository.url}`, `Authorization: Bearer ${token}`] : []
      }]
    }));
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
  async uploadConfig(config: string, digest: string, repository: Repository): Promise<{ digest: string; size: number }> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const size = config.length;
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
  async commit(config: FileItem[], repository: Repository, layers?: Manifest[]): Promise<void> {
    const [server, namespace, image] = repository.url.split('/') ?? [];
    const worker = new listWorker();
    const promiseWorker = new PromiseWorker(worker);
    const { configString, manifestString, digest }: {
      configString: string;
      manifestString: string;
      digest: string;
    } = await promiseWorker.postMessage({ config, layers });
    worker.terminate();
    await this.uploadConfig(configString, digest, repository);
    const url = `https://${server}/v2/${namespace}/${image}/manifests/latest`;
    const instance = axios.create({
      method: 'put',
      headers: {
        'Content-Type': 'application/vnd.docker.distribution.manifest.v2+json',
        'repository': [server, namespace, image].join('/')
      },
      timeout: 0
    });
    instance.interceptors.request.use(e => Object.assign(e, {
      data: manifestString
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