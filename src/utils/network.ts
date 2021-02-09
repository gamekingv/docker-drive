import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface Repository {
  name: string;
  url: string;
  value: symbol;
  token: string;
  secret: string;
}

interface FileItem {
  name: string;
  type: string;
  files?: FileItem[];
  digest?: string;
  size?: number;
  uploadTime?: number;
}

interface Manifest {
  mediaType: string;
  size: number;
  digest: string;
}

export default {
  async requestSender(url: string, instance: AxiosInstance, repository: Repository): Promise<AxiosResponse> {
    instance.defaults.timeout = 30000;
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
    if (!server || !namespace || !image) throw 'repositoryFormatError';
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
        }
      });
      const { data } = await this.requestSender(configURL, configInstance, repository);
      if (data) return { config: data, layers };
      else throw 'loadConfigFailed';
    }
    else throw 'loadConfigFailed';
  }
};