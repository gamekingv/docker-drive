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
        <v-btn @click="upload(uploadFiles)">测试上传</v-btn>
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
              @click.stop="!item.disabled && pathClick(item.id)"
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
        <span class="clickable" @click.stop="itemClick(item)">
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
      <v-hover v-slot="{ hover }">
        <div class="video">
          <video
            class="video"
            :src="video ? videoURL : ''"
            controls
            @pause="videoEventHandler"
            @play="videoEventHandler"
          ></video>
          <v-fade-transition>
            <v-overlay
              v-if="!isVideoPlay || hover"
              class="video-overlay"
              opacity="1"
              color="transparent"
            >
              <v-toolbar min-width="100vw" absolute color="transparent" flat>
                <v-toolbar-title>{{ video ? videoTitle : "" }}</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn
                  style="pointer-events: auto"
                  icon
                  @click.stop="video = false"
                >
                  <v-icon large>mdi-close</v-icon>
                </v-btn>
              </v-toolbar>
            </v-overlay>
          </v-fade-transition>
        </div>
      </v-hover>
    </v-dialog>
    <v-dialog v-model="action" persistent scrollable :max-width="400">
      <v-card>
        <v-card-title>
          <span class="headline">{{
            actionType === "rename"
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
                    dense
                    rounded
                    hoverable
                    activatable
                    :items="[folderList]"
                    item-children="files"
                    @update:active="(e) => (selectedFolder = e)"
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
            @click.stop="
              form.validate() &&
                (actionType === 'rename'
                  ? rename()
                  : actionType === 'addFolder'
                  ? addFolder()
                  : actionType === 'move' && move())
            "
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn color="error" text @click.stop="closeForm()">
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Emit, Ref } from 'vue-property-decorator';
import network from '@/utils/network';
import { Repository, FileItem, Manifest, VForm } from '@/utils/types';

interface FolderList {
  name: string;
  files: FolderList[];
  id: string;
}

@Component({
  filters: {
    formatFileSize(fileSize: number): string {
      if (!fileSize) return '-';
      else if (fileSize < 1024) {
        return `${fileSize.toFixed(2)}B`;
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

  @Ref() private readonly form!: VForm

  @Emit()
  private loading(): void { return; }
  @Emit()
  private loaded(): void { return; }
  @Emit()
  private login(authenticateHeader?: string, fn?: Function, arg?: string[]): void { ({ authenticateHeader, fn, arg }); }
  @Emit()
  private alert(text: string, type: string): void { ({ text, type }); }
  @Emit()
  private upload(Files: File[]): { file: File; path: string }[] { return Files.map(file => ({ file, path: this.currentPathString })); }

  @Prop(Array) private readonly repositories!: Repository[]
  @PropSync('active') private activeRepositoryID: symbol | undefined

  private video = false
  private videoURL = ''
  private videoTitle = ''
  private isVideoPlay = false
  private result = ''
  private action = false
  private actionType = ''
  private renameItem!: FileItem
  private newName = ''
  private folderName = ''
  private root: FileItem = { name: 'root', type: 'folder', files: [], id: Symbol() }
  private currentPath = [{ text: `${this.$t('root')}`, disabled: true, id: Symbol() }]
  private layers: Manifest[] = []
  private uploadFiles: File[] = []
  private selectedFiles: FileItem[] = []
  private folderList: FolderList = { name: `${this.$t('root')}`, files: [], id: '/' }
  private selectedFolder: string[] = []
  private readonly fileListHeader = [
    { text: this.$t('filename'), align: 'start', value: 'name' },
    { text: this.$t('fileSize'), value: 'size', sortable: false },
    { text: this.$t('fileUploadTime'), value: 'uploadTime' }
  ]

  private get currentPathString(): string {
    if (this.currentPath.length === 1) return '/';
    return this.currentPath.slice(1).reduce((s, a) => `${s}/${a.text}`, '');
  }
  private get displayList(): FileItem[] {
    return this.getPath(this.currentPathString);
  }
  private get activeRepository(): Repository | undefined {
    return this.repositories.find(e => e.value === this.activeRepositoryID);
  }

  private created(): void {
    // const config = '{"files":{"name":"root","type":"folder","files":[{"name":"怪病醫拉姆尼（僅限港澳台地區） 5.mkv","type":"file","size":792728956,"digest":"sha256:d5abb089fde002ff57cd9f2484bcab1a0498476ec3366791a8c310f95b344217","uploadTime":1612791892642},{"name":"burpsuite_pro_v1.5.18.jar","digest":"sha256:40b917c1a9034ec0c0698968c2bbbcde2e07a842043015843a30fcdd11f31b5d","size":9408739,"type":"file","uploadTime":1612921193702},{"name":"新番","type":"folder","files":[{"name":"[桜都字幕组]2021年01月合集","type":"folder","files":[{"name":"[桜都字幕组][GOLD BEAR]装煌聖姫イースフィア ～淫虐の洗脳改造～ 後編.chs.mp4","digest":"sha256:d2744be7c39d1d7f4be87a6f8596db8060122f6ae5524bad0680d7a37361d195","size":468191180,"type":"file","uploadTime":1613023430271},{"name":"[桜都字幕组][nur]背徳の境界 ～女教師のウラ側～.chs.mp4","digest":"sha256:3195a9ca7f84b63b7ecd8256124a74ade2c1cc35ea8f690048e8d5a5e33b7c7f","size":384584279,"type":"file","uploadTime":1613030194741},{"name":"[桜都字幕组][PoRO]White Blue ～白衣の往生際～.chs.mp4","digest":"sha256:676539ec3b02b812fc2df2c8764ae991450d3d48ae01dca87a36a73129db200c","size":402076633,"type":"file","uploadTime":1613031195140}],"uploadTime":1613023235774}],"uploadTime":1613023230496}]}}';
    // this.root.files = network.parseConfig(JSON.parse(config));
    this.getConfig();
  }
  async getConfig(path?: string): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    this.loading();
    try {
      const { config, layers } = await network.getManifests(this.activeRepository);
      this.layers = layers;
      this.root.files = network.parseConfig(config);
      this.currentPath = [{ text: `${this.$t('root')}`, disabled: true, id: Symbol() }];
      if (path && path !== '/') {
        path.substr(1).split('/').forEach(e => this.currentPath.push({ text: e, disabled: false, id: Symbol() }));
        this.currentPath[0].disabled = false;
        this.currentPath[this.currentPath.length - 1].disabled = true;
      }
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.getConfig);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private addFolderAction(): void {
    this.actionType = 'addFolder';
    this.action = true;
  }
  private async addFolder(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const name = this.folderName;
    this.closeForm();
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      this.getPath(this.currentPathString, cache.root).push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
      await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
      this.displayList.push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private async removeSelected(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)), layers: JSON.parse(JSON.stringify(this.layers)) };
      try {
        await this.remove(this.selectedFiles, this.currentPathString, this.activeRepository, cache.root, cache.layers);
      }
      finally {
        await network.commit({ files: cache.root.files, layers: cache.layers }, this.activeRepository);
        await this.getConfig(this.currentPathString);
      }
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.removeSelected);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private async remove(files: FileItem[], path: string, repository: Repository, root: FileItem, layers: Manifest[]): Promise<void> {
    for (const file of files) {
      const currentPath = this.getPath(path, root);
      if (file.type === 'file') {
        const digest = file.digest as string;
        try {
          await network.removeFile(digest, repository);
        }
        catch (e) {
          if (e.response?.status !== 404) throw e;
        }
        const layerIndex = layers.findIndex(e => e.digest === file.digest);
        if (layerIndex > 0) layers.splice(layerIndex, 1);
      }
      else {
        await this.remove(file.files as FileItem[], `${path === '/' ? '' : path}/${file.name}`, repository, root, layers);
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
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const name = this.newName;
    this.closeForm();
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      const renameItem = this.getPath(this.currentPathString, cache.root).find(e => e.name === this.renameItem.name);
      if (renameItem) renameItem.name = name;
      else throw 'unknownError';
      await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
      this.renameItem.name = name;
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private moveAction(): void {
    this.actionType = 'move';
    this.action = true;
    this.folderList = { name: `${this.$t('root')}`, files: [], id: '/' };
    const filterFolder = (filterFiles: FolderList, rootFiles: FileItem): void => {
      for (const file of rootFiles.files as FileItem[]) {
        if (file.type === 'folder') {
          const filterFile = { name: file.name, files: [], id: `${filterFiles.id === '/' ? '' : filterFiles.id}/${file.name}` };
          if (filterFiles.files) filterFiles.files.push(filterFile);
          filterFolder(filterFile, file);
        }
      }
    };
    filterFolder(this.folderList, this.root);
  }
  private async move(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const dPath = this.selectedFolder[0];
    this.closeForm();
    if (dPath === this.currentPathString) return;
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      const dFolder = this.getPath(dPath, cache.root);
      const sFolder = this.getPath(this.currentPathString, cache.root);
      const failFiles: FileItem[] = [];
      this.selectedFiles.forEach(file => {
        const index = sFolder.findIndex(e => e.name === file.name);
        if (dFolder.some(e => e.name === file.name)) failFiles.push(file);
        else dFolder.push(...sFolder.splice(index, 1));
      });
      await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
      this.getConfig(this.currentPathString);
      if (failFiles.length > 0) throw 'someFilenameConflict';
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private switchRepository(): void {
    this.$nextTick(() => {
      this.currentPath = this.currentPath.slice(0, 1);
      this.getConfig();
    });
  }
  private getPath(pathString: string, root?: FileItem): FileItem[] {
    const path = pathString === '/' ? [] : pathString.substr(1).split('/');
    let filePointer: FileItem = root ? root : this.root;
    for (let i = 0; i < path.length; i++) {
      const nextPointer = filePointer.files?.find(e => e.name === path[i]);
      if (nextPointer?.type === 'folder') filePointer = nextPointer;
      else {
        return (root ? root.files : this.root.files) as FileItem[];
      }
    }
    return filePointer.files ?? [];
  }
  private async itemClick(item: FileItem): Promise<void> {
    if (item.type === 'file') {
      if (!item.digest || !this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
      this.loading();
      try {
        const downloadURL = await network.getDownloadURL(item.digest, this.activeRepository);
        console.log('未完成');
        if (downloadURL) {
          if (item.name.match(/\.(mp4|mkv)$/)) {
            this.videoURL = downloadURL;
            this.videoTitle = item.name;
            this.video = true;
          }
          else {
            chrome.downloads.download({ url: downloadURL, filename: item.name });
          }
        }
        else this.alert(`${this.$t('getDownloadURLFailed')}`, 'error');
      }
      catch (error) {
        if (error.message === 'need login') this.login(error.authenticateHeader);
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      }
      this.loaded();
    }
    else {
      this.currentPath[this.currentPath.length - 1].disabled = false;
      this.currentPath.push({ text: item.name, disabled: true, id: Symbol() });
    }
  }
  private pathClick(id: symbol): void {
    this.selectedFiles = [];
    const currentIndex = this.currentPath.findIndex(e => e.id === id);
    if (typeof currentIndex === 'number') {
      this.currentPath = this.currentPath.slice(0, currentIndex + 1);
      this.currentPath[this.currentPath.length - 1].disabled = true;
    }
  }
  private closeForm(): void {
    this.form.reset();
    this.form.resetValidation();
    this.action = false;
    this.actionType = '';
  }
  private videoEventHandler(e: Event): void {
    if (e.type === 'play') this.isVideoPlay = true;
    else this.isVideoPlay = false;
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
.video-overlay {
  background-image: linear-gradient(black, transparent 25%);
  pointer-events: none;
  align-items: unset;
  justify-content: unset;
}
</style>

<style lang="scss">
.video-container {
  overflow: hidden;
  background-color: black;
  display: flex;
}
</style>