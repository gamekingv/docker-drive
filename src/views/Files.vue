<template>
  <div id="files">
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
  async mounted(): Promise<void> {
    const repositoryURL = 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test',
      [server, namespace, repository] = repositoryURL.split('/');
    try {
      await this.getManifest(server, namespace, repository);
    }
    catch (error) {
      const { status, headers } = error.response;
      if (status === 401) {
        const token = await this.getToken(headers['www-authenticate']);
        if (token) {
          this.token = token;
          try {
            await this.getManifest(server, namespace, repository);
          }
          catch (error) {
            const { status, data } = error.response;
            console.log(status, data);
          }
        }
        this.loading = false;
      }
    }
  }
  private async getManifest(server: string, namespace: string, repository: string): Promise<void> {
    const manifestsURL = `https://${server}/v2/${namespace}/${repository}/manifests/latest`;
    const instance = axios.create({
      method: 'get',
      headers: {
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        'repository': [server, namespace, repository].join('/')
      }
    });
    try {
      const { data } = await this.requestSender(manifestsURL, instance);
      this.result = JSON.stringify(data);
      this.loading = false;
    }
    catch (error) {
      if (typeof error === 'string') this.result = 'need login';
      console.error(error);
    }
  }
  private async requestSender(url: string, instance: AxiosInstance): Promise<AxiosResponse> {
    if (this.token) instance.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    instance.defaults.timeout = 30000;
    try {
      return await instance.request({ url });
    }
    catch (error) {
      const { status, headers } = error.response;
      if (status === 401) {
        const token = await this.getToken(headers['www-authenticate']);
        if (token) {
          this.token = token;
          try {
            return await instance.request({ url });
          }
          catch (error) {
            if (status === 401) throw ('need login');
            else throw error;
          }
        }
        else throw ('failed to get token');
      }
      else throw error;
    }
  }
  private async getToken(authenticateHeader: string): Promise<string | undefined> {
    const [, realm, service, , scope] = authenticateHeader?.match(/^Bearer realm="([^"]*)",service="([^"]*)"(,scope="([^"]*)"|)$/) ?? [];
    if (realm && service) {
      let authenticateURL = `${realm}?service=${service}`;
      if (scope) authenticateURL += `&scope=${scope}`;
      const headers: { 'Authorization'?: string } = {};
      if (this.secret) headers['Authorization'] = `Basic ${this.secret}`;
      const { data } = await axios.get(authenticateURL, { headers, timeout: 50000 });
      return data.token;
    }
  }
}
</script>
