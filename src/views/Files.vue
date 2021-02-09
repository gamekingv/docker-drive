<template>
  <div id="files">
    <v-row>
      <v-col cols="6" sm="3">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          label="Solo field"
          solo
          @change="switchRepository()"
        ></v-select>
      </v-col>
      <v-col cols="6" sm="3">
        <v-file-input
          v-model="uploadFiles"
          multiple
          show-size
          label="File input"
        ></v-file-input>
        <v-btn @click="commit()">测试</v-btn>
      </v-col>
    </v-row>
    <v-row>
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
    <v-dialog v-model="video" fullscreen content-class="video-container">
      <video class="video" :src="videoURL" controls></video>
    </v-dialog>
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
            @click="$refs.form.validate() && login()"
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
import axios from 'axios';
import CryptoJS from 'crypto-js';
import network from '@/utils/network';

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

interface Manifest {
  mediaType: string;
  size: number;
  digest: string;
}

@Component

export default class Files extends Vue {
  $refs!: {
    form: VForm;
  }

  private loading = false
  private loginForm = false
  private video = false
  private videoURL = ''
  private beforeLogin!: { authenticateHeader: string | undefined; fn: Function | undefined; arg: string[] }
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
  private layers: Manifest[] = []
  private uploadFiles: File[] = []
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
        secret: 'MTgwMjkyNjgzMjA6a2RqM0BhbGl5dW4='
      }, {
        name: 'test',
        value: Symbol(),
        url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test',
        token: '',
        secret: 'MTgwMjkyNjgzMjA6a2RqM0BhbGl5dW4='
      }, {
        name: 'videorepo',
        value: Symbol(),
        url: 'ccr.ccs.tencentyun.com/videorepo/videorepo',
        token: '',
        secret: 'MTAwMDA2NjU1MDMyOmtkajNAdGVuY2VudA=='
      }
    ];
    this.activeRepositoryID = this.repositories[2].value;
    this.activeRepository = this.repositories[2];
    this.getConfig();
  }
  private async getConfig(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    this.loading = true;
    try {
      const { config, layers } = await network.getManifests(this.activeRepository);
      this.layers = layers;
      if (config.fileItems) this.parseConfig(config.fileItems);
      else if (config.files) this.root = config.files;
      else throw `${this.$t('loadConfigFailed')}`;
      this.fileList = this.getPath('/');
    }
    catch (error) {
      if (error.message === 'need login') this.loginPromp(error.authenticateHeader, this.getConfig);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private async getDownloadURL(digest: string | undefined): Promise<string | undefined> {
    if (!digest || !this.activeRepository) return;
    let downloadURL = '';
    try {
      const [server, namespace, repository] = this.activeRepository.url.split('/') ?? [];
      if (!server || !namespace || !repository) throw `${this.$t('repositoryFormatError')}`;
      const url = `https://${server}/v2/${namespace}/${repository}/blobs/${digest}`;
      const request = axios.CancelToken.source();
      const instance = axios.create({
        method: 'get',
        headers: {
          'repository': [server, namespace, repository].join('/')
        },
        cancelToken: request.token,
        onDownloadProgress: (e) => {
          downloadURL = e.currentTarget.responseURL;
          request.cancel('cancel');
        }
      });
      await network.requestSender(url, instance, this.activeRepository);
    }
    catch (error) {
      if (error === 'need login') this.loginPromp();
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else if (error.message !== 'cancel') this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    return downloadURL;
  }
  private async getUploadURL(): Promise<string> {
    if (!this.activeRepository) throw 'unknownError';
    const [server, namespace, repository] = this.activeRepository.url.split('/') ?? [];
    if (!server || !namespace || !repository) throw `${this.$t('repositoryFormatError')}`;
    const instance = axios.create({
      method: 'post',
      headers: {
        'repository': [server, namespace, repository].join('/')
      }
    });
    const url = `https://${server}/v2/${namespace}/${repository}/blobs/uploads/`;
    const { headers } = await network.requestSender(url, instance, this.activeRepository);
    if (headers['location']) return headers['location'] as string;
    else throw `${this.$t('getUploadURLFailed')}`;
  }
  private async uploadConfig(): Promise<{ digest: string; size: number }> {
    if (!this.activeRepository) throw 'unknownError';
    const [server, namespace, repository] = this.activeRepository.url.split('/') ?? [];
    if (!server || !namespace || !repository) throw `${this.$t('repositoryFormatError')}`;
    const config = JSON.stringify({ files: this.root });
    const size = config.length;
    const digest = `sha256:${CryptoJS.SHA256(config)}`;
    const url = await this.getUploadURL();
    const instance = axios.create({
      method: 'put',
      headers: {
        'Content-Type': 'application/octet-stream',
        'repository': [server, namespace, repository].join('/')
      }
    });
    instance.interceptors.request.use(e => {
      e.data = new Blob([config], { type: 'application/octet-stream' });
      return e;
    });
    await network.requestSender(`${url}&digest=${digest}`, instance, this.activeRepository);
    return { digest, size };
  }
  private async commit(): Promise<void> {
    try {
      if (!this.activeRepository) throw 'unknownError';
      const [server, namespace, repository] = this.activeRepository.url.split('/') ?? [];
      if (!server || !namespace || !repository) throw `${this.$t('repositoryFormatError')}`;
      const { digest, size } = await this.uploadConfig();
      const manifest = {
        schemaVersion: 2,
        mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
        config: {
          mediaType: 'application/vnd.docker.container.image.v1+json',
          size,
          digest
        },
        layers: this.layers
      };
      const manifestsURL = `https://${server}/v2/${namespace}/${repository}/manifests/latest`;
      const manifestsInstance = axios.create({
        method: 'put',
        headers: {
          'Content-Type': 'application/vnd.docker.distribution.manifest.v2+json',
          'repository': [server, namespace, repository].join('/')
        }
      });
      manifestsInstance.interceptors.request.use(e => {
        e.data = JSON.stringify(manifest);
        return e;
      });
      await network.requestSender(manifestsURL, manifestsInstance, this.activeRepository);
    }
    catch (error) {
      if (error.message === 'need login') this.loginPromp(error.authenticateHeader, this.commit);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
  }
  private async upload(): Promise<void> {
    this.loading = true;
    for (const file of this.uploadFiles) {
      console.log(await this.hashFile(file));
    }
    this.loading = false;
  }
  private loginPromp(authenticateHeader?: string, fn?: Function, arg: string[] = []): void {
    this.loginForm = true;
    this.beforeLogin = { authenticateHeader, fn, arg };
  }
  private async login(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    this.activeRepository.secret = btoa(`${this.username}:${this.password}`);
    this.closeForm();
    this.loading = true;
    if (this.beforeLogin.authenticateHeader) {
      try {
        const token = await network.getToken(this.beforeLogin.authenticateHeader, this.activeRepository);
        if (token) this.activeRepository.token = token;
      }
      catch (error) {
        if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
        else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      }
    }
    this.loading = false;
    if (this.beforeLogin.fn) this.beforeLogin.fn(...this.beforeLogin.arg);
  }
  private switchRepository(): void {
    this.activeRepository = this.repositories.find(e => e.value === this.activeRepositoryID);
    this.currentPath = this.currentPath.slice(0);
    this.fileList = [];
    this.getConfig();
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
        return this.root.files as FileItem[];
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
  private async hashFile(file: File): Promise<string> {
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
  private async itemClick(item: FileItem): Promise<void> {
    if (item.type === 'file') {
      const downloadURL = await this.getDownloadURL(item.digest);
      if (downloadURL) {
        if (item.name.match(/\.(mp4|mkv)$/)) {
          this.video = true;
          this.videoURL = downloadURL;
        }
        else {
          chrome.downloads.download({ url: downloadURL, filename: item.name });
        }
      }
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
    else this.fileList = this.getPath('/');
  }
  private showAlert(text: string, type = ''): void {
    this.alert = true;
    this.alertText = text;
    this.alertColor = type;
  }
  private closeForm(): void {
    this.$refs.form.reset();
    this.$refs.form.resetValidation();
    this.loginForm = false;
  }
}
</script>

<style scope lang="scss">
.clickable {
  cursor: pointer;
}
.video {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
}
</style>

<style lang="scss">
.video-container {
  overflow: hidden !important;
  background-color: black;
  display: flex;
}
</style>