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
        <v-btn @click="upload()">测试上传</v-btn>
        <v-btn @click="addFolderAction()">测试新建文件夹</v-btn>
        <v-btn @click="removeSelected()">测试删除</v-btn>
        <v-btn @click="renameAction(selectedFiles[0])">测试重命名</v-btn>
        <v-btn @click="moveAction()">测试移动</v-btn>
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
      v-model="selectedFiles"
      class="grey darken-3"
      :headers="fileListHeader"
      :items="displayList"
      :items-per-page="10"
      item-key="name"
      show-select
    >
      <template v-slot:[`item.name`]="{ item }">
        <span class="clickable" @click="itemClick(item)">
          {{ item.name }}
        </span>
      </template>
      <template v-slot:[`item.size`]="{ item }">
        {{ item.size | formatFileSize }}
      </template>
      <template v-slot:[`item.uploadTime`]="{ item }">
        {{ item.uploadTime | formatTime }}
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
    <v-dialog v-model="action" persistent max-width="400px">
      <v-card>
        <v-card-title>
          <span class="headline">{{
            actionType === "login"
              ? $t("needLogin")
              : actionType === "rename"
              ? $t("newName")
              : actionType === "addFolder"
              ? $t("newFolderName")
              : actionType === "move"
              ? $t("moveTo")
              : ""
          }}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-form ref="form" lazy-validation>
              <v-row>
                <v-col v-if="actionType === 'login'" cols="12">
                  <v-text-field
                    v-model="username"
                    :label="$t('account')"
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col v-if="actionType === 'login'" cols="12">
                  <v-text-field
                    v-model="password"
                    :label="$t('password')"
                    :rules="[(v) => !!v || $t('require')]"
                    type="password"
                    required
                  ></v-text-field>
                </v-col>
                <v-col v-if="actionType === 'rename'" cols="12">
                  <v-text-field
                    v-model="newName"
                    :rules="[
                      (v) => !!v || $t('require'),
                      (v) =>
                        !displayList.some((e) => e.name === v) ||
                        $t('duplicate'),
                    ]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col v-if="actionType === 'addFolder'" cols="12">
                  <v-text-field
                    v-model="folderName"
                    :rules="[
                      (v) => !!v || $t('require'),
                      (v) =>
                        !displayList.some((e) => e.name === v) ||
                        $t('duplicate'),
                    ]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col v-if="actionType === 'move'" cols="12">
                  <v-treeview
                    rounded
                    hoverable
                    activatable
                    :items="[folderList]"
                    item-children="files"
                  >
                    <template v-slot:prepend="{ open }">
                      <v-icon>
                        {{ open ? "mdi-folder-open" : "mdi-folder" }}
                      </v-icon>
                    </template>
                  </v-treeview>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            @click="
              $refs.form.validate() &&
                (actionType === 'login'
                  ? login()
                  : actionType === 'rename'
                  ? rename()
                  : actionType === 'addFolder'
                  ? addFolder()
                  : actionType === 'move' && move())
            "
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

@Component({
  filters: {
    formatFileSize(fileSize: number): string {
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
    },
    formatTime(time: number): string {
      if (!time) return '-';
      const date = new Date(time);
      const addZero = (n: number): string => `0${n}`.substr(-2);
      return `${date.getFullYear()}-${addZero(date.getMonth() + 1)}-${addZero(date.getDate())} ${addZero(date.getHours())}:${addZero(date.getMinutes())}`;
    }
  }
})

export default class Files extends Vue {
  $refs!: {
    form: VForm;
  }

  private loading = false
  private video = false
  private videoURL = ''
  private beforeLogin!: { authenticateHeader: string | undefined; fn: Function | undefined; arg: string[] }
  private result = ''
  private action = false
  private actionType = ''
  private username = ''
  private password = ''
  private renameItem!: FileItem
  private newName = ''
  private folderName = ''
  private alert = false
  private alertText = ''
  private alertColor = ''
  private activeRepositoryID!: symbol
  private activeRepository!: Repository | undefined
  private repositories!: Repository[]
  private root: FileItem = { name: 'root', type: 'folder', files: [], id: Symbol() }
  private currentPath = [{ text: `${this.$t('root')}`, disabled: true, id: Symbol() }]
  private layers: Manifest[] = []
  private uploadFiles: File[] = []
  private selectedFiles: FileItem[] = []
  private folderList!: FileItem
  private readonly fileListHeader = [
    { text: this.$t('filename'), align: 'start', value: 'name' },
    { text: this.$t('fileSize'), value: 'size', sortable: false },
    { text: this.$t('fileUploadTime'), value: 'uploadTime' }
  ]
  get currentPathString(): string {
    if (this.currentPath.length === 1) return '/';
    return this.currentPath.slice(1).reduce((s, a) => `${s}/${a.text}`, '');
  }

  get displayList(): FileItem[] {
    return this.getPath(this.currentPathString);
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
      this.parseConfig(config);
    }
    catch (error) {
      if (error.message === 'need login') this.loginAction(error.authenticateHeader, this.getConfig);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private async upload(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    this.loading = true;
    const currentPathString = this.currentPathString;
    try {
      const { digest, size } = await network.uploadFile(this.uploadFiles[0], this.activeRepository, this.onUploadProgress);
      const cache = { root: JSON.parse(JSON.stringify(this.root)), layers: JSON.parse(JSON.stringify(this.layers)) };
      this.getPath(currentPathString, cache.root).push({ name: this.uploadFiles[0].name, digest, size, type: 'file', uploadTime: Date.now(), id: Symbol() });
      cache.layers.push({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest, size });
      await network.commit({ files: cache.root, layers: cache.layers }, this.activeRepository);
      this.getPath(currentPathString).push({ name: this.uploadFiles[0].name, digest, size, type: 'file', uploadTime: Date.now(), id: Symbol() });
      this.layers.push({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest, size });
    }
    catch (error) {
      if (error.message === 'need login') this.loginAction(error.authenticateHeader, this.upload);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private addFolderAction(): void {
    this.actionType = 'addFolder';
    this.action = true;
  }
  private async addFolder(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    const name = this.folderName;
    this.closeForm();
    this.loading = true;
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      this.getPath(this.currentPathString, cache.root).push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
      await network.commit({ files: cache.root, layers: this.layers }, this.activeRepository);
      this.displayList.push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
    }
    catch (error) {
      if (error.message === 'need login') this.loginAction(error.authenticateHeader);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private async removeSelected(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    this.loading = true;
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)), layers: JSON.parse(JSON.stringify(this.layers)) };
      try {
        await this.remove(this.selectedFiles, this.currentPathString, this.activeRepository, cache.root, cache.layers, false);
      }
      finally {
        await network.commit({ files: cache.root, layers: cache.layers }, this.activeRepository);
        await this.remove(this.selectedFiles, this.currentPathString, this.activeRepository, this.root, this.layers, true);
      }
    }
    catch (error) {
      if (error.message === 'need login') this.loginAction(error.authenticateHeader, this.removeSelected);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private async remove(files: FileItem[], path: string, repository: Repository, root: FileItem, layers: Manifest[], local: boolean): Promise<void> {
    for (const file of files) {
      const currentPath = this.getPath(path, root);
      if (file.type === 'file') {
        const digest = file.digest as string;
        try {
          !local && await network.removeFile(digest, repository);
        }
        catch (e) {
          if (e.response?.status !== 404) throw e;
        }
        const layerIndex = layers.findIndex(e => e.digest === file.digest);
        if (layerIndex > 0) layers.splice(layerIndex, 1);
      }
      else {
        await this.remove(file.files as FileItem[], `${path === '/' ? '' : path}/${file.name}`, repository, root, layers, local);
      }
      const listIndex = currentPath.findIndex(e => e.name === file.name);
      if (listIndex > 0) currentPath.splice(listIndex, 1);
    }
  }
  private renameAction(renameItem: FileItem): void {
    this.newName = renameItem.name;
    this.renameItem = renameItem;
    this.actionType = 'rename';
    this.action = true;
  }
  private async rename(): Promise<void> {
    if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    const name = this.newName;
    this.closeForm();
    this.loading = true;
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      const renameItem = this.getPath(this.currentPathString, cache.root).find(e => e.name === this.renameItem.name);
      if (renameItem) renameItem.name = name;
      else throw 'unknownError';
      await network.commit({ files: cache.root, layers: this.layers }, this.activeRepository);
      this.renameItem.name = name;
    }
    catch (error) {
      if (error.message === 'need login') this.loginAction(error.authenticateHeader);
      else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
      else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loading = false;
  }
  private moveAction(): void {
    this.actionType = 'move';
    this.action = true;
    this.folderList = { name: `${this.$t('root')}`, type: 'folder', files: [], id: this.root.id };
    const filterFolder = (filterFiles: FileItem[], rootFiles: FileItem[]): void => {
      for (const file of rootFiles) {
        if (file.type === 'folder') {
          const filterFile = { name: file.name, type: 'folder', files: [], id: file.id };
          filterFiles.push(filterFile);
          filterFolder(filterFile.files, file.files as FileItem[]);
        }
      }
    };
    filterFolder(this.folderList.files as FileItem[], this.root.files as FileItem[]);
  }
  private async move(): Promise<void> {
    // if (!this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    // const name = this.folderName;
    // this.closeForm();
    // this.loading = true;
    // try {
    //   const cache = { root: JSON.parse(JSON.stringify(this.root)) };
    //   this.getPath(this.currentPathString, cache.root).push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
    //   await network.commit({ files: cache.root, layers: this.layers }, this.activeRepository);
    //   this.displayList.push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
    // }
    // catch (error) {
    //   if (error.message === 'need login') this.loginAction(error.authenticateHeader);
    //   else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
    //   else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    // }
    // this.loading = false;
  }
  private onUploadProgress(e: ProgressEvent): void {
    console.log(e);
  }
  private loginAction(authenticateHeader?: string, fn?: Function, arg: string[] = []): void {
    this.actionType = 'login';
    this.action = true;
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
    this.currentPath = this.currentPath.slice(0, 1);
    this.root.files = [];
    this.getConfig();
  }
  private parseConfig(config: { fileItems?: FileItem[]; files?: FileItem }): void {
    if (config.fileItems) {
      config.fileItems.forEach(({ name: pathString, size, digest, uploadTime }) => {
        if (!uploadTime) uploadTime = Date.now();
        const path = pathString.substr(1).split('/');
        const type = digest ? 'file' : 'folder';
        let filePointer: FileItem = this.root;
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
    }
    else if (config.files) {
      const addID = (files: FileItem[]): void => {
        files.forEach(file => {
          file.id = Symbol();
          if (file.files) addID(file.files);
        });
      };
      addID(config.files.files as FileItem[]);
      this.root.files = config.files.files;
    }
    else throw `${this.$t('loadConfigFailed')}`;
  }
  private getPath(pathString: string, root?: FileItem): FileItem[] {
    const path = pathString === '/' ? [] : pathString.substr(1).split('/');
    let filePointer: FileItem = root ? root : this.root;
    for (let i = 0; i < path.length; i++) {
      const nextPointer = filePointer.files?.find(e => e.name === path[i]);
      if (nextPointer && nextPointer.type === 'folder') filePointer = nextPointer;
      else {
        return (root ? root.files : this.root.files) as FileItem[];
      }
    }
    return filePointer.files ?? [];
  }
  private async itemClick(item: FileItem): Promise<void> {
    if (item.type === 'file') {
      if (!item.digest || !this.activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
      this.loading = true;
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
        else this.showAlert(`${this.$t('getDownloadURLFailed')}`, 'error');
      }
      catch (error) {
        if (error.message === 'need login') this.loginAction(error.authenticateHeader);
        else if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
        else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      }
      this.loading = false;
    }
    else {
      this.currentPath[this.currentPath.length - 1].disabled = false;
      this.currentPath.push({ text: item.name, disabled: true, id: Symbol() });
    }
  }
  private pathClick(id: symbol): void {
    const currentIndex = this.currentPath.findIndex(e => e.id === id);
    if (typeof currentIndex === 'number') {
      this.currentPath = this.currentPath.slice(0, currentIndex + 1);
      this.currentPath[this.currentPath.length - 1].disabled = true;
    }
  }
  private showAlert(text: string, type = ''): void {
    this.alert = true;
    this.alertText = text;
    this.alertColor = type;
  }
  private closeForm(): void {
    this.$refs.form.reset();
    this.$refs.form.resetValidation();
    this.action = false;
    this.actionType = '';
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