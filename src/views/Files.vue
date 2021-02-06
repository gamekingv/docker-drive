<template>
  <div id="files">
    <v-row>
      <v-col cols="4" sm="3">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          label="Solo field"
          solo
          @change="switchRepository()"
        ></v-select>
      </v-col>
      <v-col cols="8" sm="3">
        <v-breadcrumbs :items="currentPath">
          <template v-slot:item="{ item }">
            <v-breadcrumbs-item
              :disabled="item.disabled"
              :class="{ clickable: !item.disabled }"
              @click="!item.disabled && pathClick(item.id)"
            >
              {{ item.text }}
            </v-breadcrumbs-item>
          </template>
        </v-breadcrumbs>
      </v-col>
    </v-row>
    <v-data-table
      class="grey darken-3"
      :headers="fileListHeader"
      :items="fileList"
      :items-per-page="10"
      show-select
    >
      <template v-slot:[`item.name`]="{ item }">
        <span class="clickable" @click="itemClick(item)">
          {{ item.name }}
        </span>
      </template>
      <template v-slot:[`item.size`]="{ item }">
        {{ formatFileSize(item.size) }}
      </template>
      <template v-slot:[`item.uploadTime`]="{ item }">
        {{ formatTime(item.uploadTime) }}
      </template>
    </v-data-table>
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
import { Component, Vue } from 'vue-property-decorator';
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

interface FileItem {
  name: string;
  type: string;
  files?: FileItem[];
  digest?: string;
  size?: number;
  uploadTime?: number;
}

@Component

export default class Files extends Vue {
  $refs!: {
    form: VForm;
  }

  private loading = false
  private loginForm = false
  private beforeLogin!: { fn: Function | undefined; arg: string[] }
  private result = ''
  private username = ''
  private password = ''
  private alert = false
  private alertText = ''
  private alertColor = ''
  private activeRepositoryID!: symbol
  private activeRepository!: Repository | undefined
  private repositories!: Repository[]
  private root: FileItem = { name: 'root', type: 'folder', files: [] }
  private currentPath = [{ text: `${this.$t('root')}`, disabled: true, id: Symbol() }]
  private fileList: FileItem[] = []
  private fileListHeader = [
    { text: this.$t('filename'), align: 'start', value: 'name' },
    { text: this.$t('fileSize'), value: 'size', sortable: false },
    { text: this.$t('fileUploadTime'), value: 'uploadTime' }
  ]

  created(): void {
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
    const config = JSON.parse('[{"name":"/test1.mp4","size":2429763012,"digest":"sha256:66c037e96ec05c59636d78078d503b3654a71d28ae20be613f0601105bade2a3"},{"name":"/test2.mp4","size":3255284521,"digest":"sha256:46dbfdbc373e177738b02bd235fd2b1a06d06d7e141a61b13e8b592be24b52d1"},{"name":"/tset4/[夜桜字幕组][190602][SanaYaoi]Goblins cave vol.01[GB].mp4","size":21747736,"digest":"sha256:ae822faedaa45add16b3bc90849de0d9bdf002e7f30dfc2d3ea37ae1c3cec0a8"},{"name":"/tset4/[夜桜字幕组][191222][PerfectDeadbeat]GADABOUT[GB].mp4","size":249068551,"digest":"sha256:b4c1bb7b71128c58e840c03a243cb2bae9814df8dba0e8d17be3fa6ed405af8a"},{"name":"/tset4/[夜桜字幕组][171028][iLand]キモヲタ教師が、可愛い女生徒に 性活指導!![GB].mp4","size":286456914,"digest":"sha256:8f6f1877eb639536fd903e754a162aa00532e153fd9566042321e2cbd82a782c"},{"name":"/tset4/[夜桜字幕组][181227][t japan]New Glass the Movie[自购][GB].mp4","size":486294574,"digest":"sha256:28bb2083eb728971775d85724703ddd7752181a40d917e9178e5369d340cb6c1"},{"name":"/tset4/[夜桜字幕组][201225][WORLDPG ANIMATION]巫女神さま -The Motion Anime-[GB].mp4","size":492989609,"digest":"sha256:d90f123ba0b27e5c8712570fac9eba7fe89f7d6acbf95c1ae0c755432511812a"},{"name":"/[NC-Raws] 勇者鬥惡龍 達伊的大冒險 - 18 [WEB-DL][1080p][AVC AAC][CHT][MP4].mp4","size":890429223,"digest":"sha256:84e3005c84018e004aca5f65ca3ec0d81aba3eef419794b4bd6aa795d4806dd3"}]');
    this.parseConfig(config);
    this.fileList = this.getPath('/');
    //this.getManifests();
  }
  private async getManifests(): Promise<void> {
    this.loading = true;
    const [server, namespace, repository] = this.activeRepository?.url.split('/') ?? [];
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
        if (config) this.parseConfig(config);
        else this.showAlert(`${this.$t('loadConfigFailed')}`, 'error');
      }
      else this.showAlert(`${this.$t('loadConfigFailed')}`, 'error');
    }
    catch (error) {
      if (error === -1) this.loginPromp(this.getManifests);
      else if (typeof error === 'string') this.showAlert(error, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private async requestSender(url: string, instance: AxiosInstance): Promise<AxiosResponse> {
    instance.defaults.timeout = 30000;
    if (this.activeRepository?.token) instance.defaults.headers.common['Authorization'] = `Bearer ${this.activeRepository.token}`;
    try {
      return await instance.request({ url });
    }
    catch (error) {
      if (error.response) {
        const { status, headers } = error.response;
        if (status === 401) {
          const token = await this.getToken(headers['www-authenticate']);
          if (token) {
            if (this.activeRepository) this.activeRepository.token = token;
            instance.defaults.headers.common['Authorization'] = `Bearer ${this.activeRepository?.token}`;
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
  private async getToken(authenticateHeader: string): Promise<string | undefined> {
    const [, realm, service, , scope] = authenticateHeader?.match(/^Bearer realm="([^"]*)",service="([^"]*)"(,scope="([^"]*)"|)/) ?? [];
    if (realm && service) {
      let authenticateURL = `${realm}?service=${service}`;
      if (scope) authenticateURL += `&scope=${scope}`;
      const headers: { 'Authorization'?: string } = {};
      if (this.activeRepository?.secret) headers['Authorization'] = `Basic ${this.activeRepository.secret}`;
      const { data } = await axios.get(authenticateURL, { headers, timeout: 5000 });
      return data.token;
    }
  }
  private loginPromp(fn?: Function, arg?: string[]): void {
    this.loginForm = true;
    this.beforeLogin = { fn: fn, arg: arg ?? [] };
  }
  private login(): void {
    if (this.activeRepository) this.activeRepository.secret = btoa(`${this.username}:${this.password}`);
    if (this.beforeLogin.fn) this.beforeLogin.fn(...this.beforeLogin.arg);
  }
  private switchRepository(): void {
    this.activeRepository = this.repositories.find(e => e.value === this.activeRepositoryID);
    this.getManifests();
  }
  private parseConfig(config: FileItem[]): void {
    this.root = { name: 'root', type: 'folder', files: [] };
    config.forEach(({ name: pathString, size, digest, uploadTime }) => {
      uploadTime = Date.now();
      const path = pathString.substr(1).split('/');
      const type = digest ? 'file' : 'folder';
      let filePointer: FileItem = this.root;
      for (let i = 0; i < path.length - 1; i++) {
        const nextPointer = filePointer.files?.find(e => e.name === path[i]);
        if (nextPointer) filePointer = nextPointer;
        else {
          const item: FileItem = {
            name: path[i],
            type: 'folder',
            files: []
          };
          if (uploadTime && (!item.uploadTime || item.uploadTime < uploadTime)) item.uploadTime = uploadTime;
          filePointer.files?.push(item);
          filePointer = item;
        }
      }
      if (type === 'folder') filePointer.files?.push({ name: path[path.length - 1], type, files: [] });
      else filePointer.files?.push({
        name: path[path.length - 1],
        type,
        size,
        digest,
        uploadTime
      });
    });
  }
  private getPath(pathString: string): FileItem[] {
    const path = pathString === '/' ? [] : pathString.substr(1).split('/');
    let filePointer: FileItem = this.root;
    for (let i = 0; i < path.length; i++) {
      const nextPointer = filePointer.files?.find(e => e.name === path[i]);
      if (nextPointer && nextPointer.type === 'folder') filePointer = nextPointer;
      else {
        console.error('not such path');
        break;
      }
    }
    return filePointer.files ?? [];
  }
  private formatFileSize(fileSize: number): string {
    if (!fileSize) return '-';
    else if (fileSize < 1024) {
      return fileSize + 'B';
    } else if (fileSize < (1024 * 1024)) {
      return `${(fileSize / 1024).toFixed(2)}KB`;
    } else if (fileSize < (1024 * 1024 * 1024)) {
      return `${(fileSize / (1024 * 1024)).toFixed(2)}MB`;
    } else {
      return `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB`;
    }
  }
  private formatTime(time: number): string {
    const date = new Date(time);
    const addZero = (n: number): string => `0${n}`.substr(-2);
    return `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(date.getDate())} ${addZero(date.getHours())}:${addZero(date.getMinutes())}`;
  }
  private itemClick(item: FileItem): void {
    if (item.type === 'file') {
      alert(item.name);
    }
    else {
      this.currentPath[this.currentPath.length - 1].disabled = false;
      this.currentPath.push({ text: item.name, disabled: true, id: Symbol() });
      this.fileList = this.getPath(this.currentPath.slice(1).reduce((s, a) => `${s}/${a.text}`, ''));
    }
  }
  private pathClick(id: symbol): void {
    const currentIndex = this.currentPath.findIndex(e => e.id === id);
    if (typeof currentIndex === 'number') {
      this.currentPath = this.currentPath.slice(0, currentIndex + 1);
      this.currentPath[this.currentPath.length - 1].disabled = true;
      if (currentIndex === 0) {
        this.fileList = this.getPath('/');
      }
      else {
        this.fileList = this.getPath(this.currentPath.slice(1).reduce((s, a) => `${s}/${a.text}`, ''));
      }
    }
    else console.error('not such path');
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

<style scoped lang="scss">
.clickable {
  cursor: pointer;
}
</style>