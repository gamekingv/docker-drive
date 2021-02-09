<template>
  <div id="files">
    <v-row>
      <v-col cols="6">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          label="Solo field"
          solo
          @change="switchRepository()"
        ></v-select>
      </v-col>
      <v-col cols="6">
        <v-file-input
          v-model="uploadFiles"
          multiple
          show-size
          label="File input"
        ></v-file-input>
        <v-btn @click="upload()">测试</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
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
import network from '@/utils/network';
import { Repository, FileItem, Manifest } from '@/utils/types';

interface VForm extends Vue {
  validate(): boolean;
  reset(): void;
  resetValidation(): void;
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
  get currentPathString(): string {
    return this.currentPath.slice(1).reduce((s, a) => `${s}/${a.text}`, '');
  }

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
  private async upload(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    this.loading = true;
    const currentPath = this.currentPathString;
    try {
      const { digest, size } = await network.uploadFile(this.uploadFiles[0], this.activeRepository, this.onUploadProgress);
      const folder = this.getPath(currentPath, true);
      folder.push({ name: this.uploadFiles[0].name, digest, size, type: 'file', uploadTime: Date.now() });
      this.layers.push({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest, size });
      await network.commit({ files: this.root, layers: this.layers }, this.activeRepository);
      if (currentPath === this.currentPathString) this.fileList = this.getPath(currentPath);
    }
    catch (error) {
      if (error.message === 'need login') this.loginPromp(error.authenticateHeader, this.upload);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private onUploadProgress(e: ProgressEvent): void {
    console.log(e);
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
  private getPath(pathString: string, reference = false): FileItem[] {
    const path = pathString === '/' ? [] : pathString.substr(1).split('/');
    let filePointer: FileItem = this.root;
    for (let i = 0; i < path.length; i++) {
      const nextPointer = filePointer.files?.find(e => e.name === path[i]);
      if (nextPointer && nextPointer.type === 'folder') filePointer = nextPointer;
      else {
        if (reference) return this.root.files as FileItem[];
        else return JSON.parse(JSON.stringify(this.root.files));
      }
    }
    if (reference) return filePointer.files ?? [];
    else return JSON.parse(JSON.stringify(filePointer.files ?? []));
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
  private async itemClick(item: FileItem): Promise<void> {
    if (item.type === 'file') {
      if (!item.digest || !this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
      try {
        const downloadURL = await network.getDownloadURL(item.digest, this.activeRepository);
        console.log('未完成');
        if (downloadURL) {
          if (item.name.match(/\.(mp4|mkv)$/)) {
            this.video = true;
            this.videoURL = downloadURL;
          }
          else {
            chrome.downloads.download({ url: downloadURL, filename: item.name });
          }
        }
        else return this.showAlert(`${this.$t('getDownloadURLFailed')}`, 'error');
      }
      catch (error) {
        if (error.message === 'need login') this.loginPromp(error.authenticateHeader);
        else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
        else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      }
    }
    else {
      this.currentPath[this.currentPath.length - 1].disabled = false;
      this.currentPath.push({ text: item.name, disabled: true, id: Symbol() });
      this.fileList = this.getPath(this.currentPathString);
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
        this.fileList = this.getPath(this.currentPathString);
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
  overflow: hidden;
  background-color: black;
  display: flex;
}
</style>