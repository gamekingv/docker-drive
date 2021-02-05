<template>
  <div id="files">
    <v-row>
      <v-col cols="12" sm="3">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          label="Solo field"
          solo
          @change="switchRepository()"
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
    <v-dialog v-model="loginForm" persistent max-width="400px">
      <v-card>
        <v-card-title>
          <span class="headline">{{ $t("needLogin") }}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-form ref="form" lazy-validation>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="username"
                    :label="$t('account')"
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="password"
                    :label="$t('password')"
                    :rules="[(v) => !!v || $t('require')]"
                    type="password"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            @click="$refs.form.validate() && !login() && closeForm()"
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn color="error" text @click="closeForm()">
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
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

interface VForm extends Vue {
  validate(): boolean;
  reset(): void;
  resetValidation(): void;
}

interface Repository {
  name: string;
  url: string;
  value: symbol;
  token: string;
  secret: string;
}

@Component({
  components: {
    HelloWorld
  }
})

export default class Files extends Vue {
  $refs!: {
    form: VForm;
  }

  private loading = false
  private loginForm = false
  private beforeLogin!: { fn: string; arg: string[] }
  private result = ''
  private username = ''
  private password = ''
  private alert = false
  private alertText = ''
  private alertColor = ''
  private activeRepositoryID!: symbol
  private activeRepository!: Repository
  private repositories!: Repository[]

  async created(): Promise<void> {
    this.repositories = [
      {
        name: 'kdjvideo',
        value: Symbol(),
        url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/kdjvideo',
        token: '',
        secret: ''
      }, {
        name: 'test',
        value: Symbol(),
        url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test',
        token: '',
        secret: ''
      }
    ];
    this.activeRepositoryID = this.repositories[1].value;
    this.activeRepository = this.repositories[1];
    await this.getManifests();
  }
  private async getManifests(): Promise<void> {
    this.loading = true;
    const [server, namespace, repository] = this.activeRepository.url.split('/');
    if (!server || !namespace || !repository) {
      this.loading = false;
      return this.showAlert(`${this.$t('repositoryFormatError')}`, 'error');
    }
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
        const configURL = `https://${server}/v2/${namespace}/${repository}/blobs/${digest}`;
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
      if (error === -1) this.loginPromp('getManifests');
      else if (typeof error === 'string') this.showAlert(error, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private async requestSender(url: string, instance: AxiosInstance): Promise<AxiosResponse> {
    instance.defaults.timeout = 30000;
    if (this.activeRepository.token) instance.defaults.headers.common['Authorization'] = `Bearer ${this.activeRepository.token}`;
    try {
      return await instance.request({ url });
    }
    catch (error) {
      if (error.response) {
        const { status, headers } = error.response;
        if (status === 401) {
          const token = await this.getToken(headers['www-authenticate']);
          if (token) {
            this.activeRepository.token = token;
            console.log(this.activeRepository);
            instance.defaults.headers.common['Authorization'] = `Bearer ${this.activeRepository.token}`;
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
      }
      throw error;
    }
  }
  private loginPromp(fn?: string, arg?: string[]): void {
    this.loginForm = true;
    this.beforeLogin = { fn: fn ?? '', arg: arg ?? [] };

  }
  private login(): void {
    this.activeRepository.secret = btoa(`${this.username}:${this.password}`);
    //this.beforeLogin.fn ?? this[this.beforeLogin.fn] ?? this[this.beforeLogin.fn](...this.beforeLogin.arg);
  }
  private async getToken(authenticateHeader: string): Promise<string | undefined> {
    const [, realm, service, , scope] = authenticateHeader?.match(/^Bearer realm="([^"]*)",service="([^"]*)"(,scope="([^"]*)"|)/) ?? [];
    if (realm && service) {
      let authenticateURL = `${realm}?service=${service}`;
      if (scope) authenticateURL += `&scope=${scope}`;
      const headers: { 'Authorization'?: string } = {};
      if (this.activeRepository.secret) headers['Authorization'] = `Basic ${this.activeRepository.secret}`;
      const { data } = await axios.get(authenticateURL, { headers, timeout: 5000 });
      return data.token;
    }
  }
  private switchRepository(): void {
    this.activeRepository = this.repositories.find(e => e.value === this.activeRepositoryID) ?? {
      name: '',
      url: '',
      value: Symbol(),
      token: '',
      secret: ''
    };
    this.getManifests();
  }
  private showAlert(text: string, type?: string): void {
    this.alert = true;
    this.alertText = text;
    this.alertColor = type ?? '';
  }
  private closeForm(): void {
    this.$refs.form.reset();
    this.$refs.form.resetValidation();
    this.loginForm = false;
  }
}
</script>
