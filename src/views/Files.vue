<template>
  <div id="files">
    <v-row>
      <v-col cols="12" sm="3">
        <v-select
          v-model="activeRepository"
          :items="repositoryURLs"
          item-text="name"
          item-value="url"
          label="Solo field"
          @change="getManifests"
          solo
        ></v-select>
      </v-col>
    </v-row>
    <HelloWorld :msg="result" />
    <v-dialog v-model="loading" persistent width="300">
      <v-card color="primary" dark>
        <v-card-text>
          {{ $t("loading") }}
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-snackbar v-model="alert" :color="alertColor" :timeout="5000" top right>
      {{ alertText }}
    </v-snackbar>
  </div>
</template>

<script lang="ts">
// @ is an alias to /src
import { Component, Vue } from 'vue-property-decorator';
import HelloWorld from '@/components/HelloWorld.vue';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

@Component({
  components: {
    HelloWorld
  }
})

export default class Files extends Vue {
  private loading = true
  private result = ''
  private secret = ''
  private token = ''
  private alert = false
  private alertText = ''
  private alertColor = ''
  private activeRepository = 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test'
  private repositoryURLs: { name: string; url: string }[] = [{ name: 'kdjvideo', url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/kdjvideo' }, { name: 'test', url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test' }]
  async mounted(): Promise<void> {
    await this.getManifests();
    this.loading = false;
  }
  private async getManifests(): Promise<void> {
    const [server, namespace, repository] = this.activeRepository.split('/');
    if (!server || !namespace || !repository) return this.showAlert(`${this.$t('repositoryFormatError')}`, 'error');
    const manifestsURL = `https://${server}/v2/${namespace}/${repository}/manifests/latest`;
    const manifestsInstance = axios.create({
      method: 'get',
      headers: {
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        'repository': [server, namespace, repository].join('/')
      }
    });
    try {
      const { data } = await this.requestSender(manifestsURL, manifestsInstance);
      const digest: string = data?.config?.digest;
      if (digest) {
        const configURL = `https://registry.cn-hangzhou.aliyuncs.com/v2/kdjvideo/test/blobs/${digest}`;
        const configInstance = axios.create({
          method: 'get',
          headers: {
            'repository': [server, namespace, repository].join('/')
          }
        });
        const { data } = await this.requestSender(configURL, configInstance);
        const config = data?.fileItems;
        if (config) this.result = JSON.stringify(config);
        else this.showAlert(`${this.$t('loadConfigFailed')}`, 'error');
      }
      else this.showAlert(`${this.$t('loadConfigFailed')}`, 'error');
    }
    catch (error) {
      if (error === -1) this.showAlert('need login');
      else if (typeof error === 'string') this.showAlert(error, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
  }
  private async requestSender(url: string, instance: AxiosInstance): Promise<AxiosResponse> {
    instance.defaults.timeout = 30000;
    if (this.token) instance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    try {
      return await instance.request({ url });
    }
    catch (error) {
      const { status, headers } = error.response;
      if (status === 401) {
        const token = await this.getToken(headers['www-authenticate']);
        if (token) {
          this.token = token;
          instance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
          try {
            return await instance.request({ url });
          }
          catch (error) {
            const { status } = error.response;
            if (status === 401) throw (-1);
            else throw error;
          }
        }
        else throw (this.$t('getTokenFailed'));
      }
      else throw error;
    }
  }
  // private async login(): Promise<AxiosResponse> {
  // let status: number = error.response.status, isCancel: boolean = false;
  // while (status === 401 || !isCancel) {

  //   if
  // }
  // }
  private async getToken(authenticateHeader: string): Promise<string | undefined> {
    const [, realm, service, , scope] = authenticateHeader?.match(/^Bearer realm="([^"]*)",service="([^"]*)"(,scope="([^"]*)"|)/) ?? [];
    if (realm && service) {
      let authenticateURL = `${realm}?service=${service}`;
      if (scope) authenticateURL += `&scope=${scope}`;
      const headers: { 'Authorization'?: string } = {};
      if (this.secret) headers['Authorization'] = `Basic ${this.secret}`;
      const { data } = await axios.get(authenticateURL, { headers, timeout: 50000 });
      return data.token;
    }
  }
  private showAlert(text: string, type?: string): void {
    this.alert = true;
    this.alertText = text;
    this.alertColor = type ?? '';
  }
}
</script>
