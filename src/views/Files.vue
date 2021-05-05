<template>
  <div v-if="repositories.length > 0">
    <v-row>
      <v-col cols="12" md="5" sm="7" xs="3" class="py-0">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          item-value="id"
          label="Solo field"
          solo
          hide-details
        >
          <template v-slot:append-item>
            <v-divider class="mt-2"></v-divider>
            <v-list-item ripple to="/repositories?type=add">
              <v-list-item-action>
                <v-icon color="green" left> mdi-plus </v-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{ $t("add") }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
          <template v-if="activeRepository.useDatabase" v-slot:append-outer>
            <v-btn icon style="margin-top: -6px" @click.stop="refresh()">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </template>
        </v-select>
      </v-col>
      <v-spacer></v-spacer>
      <v-col class="d-flex justify-end align-center">
        <div>
          {{ `${layers.length}${$t("statistics")}`
          }}{{
            layers.reduce((total, layer) => (total += layer.size), 0)
              | sizeFormat
          }}
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="pb-0">
        <v-breadcrumbs class="pl-0 pb-0" :items="currentPath">
          <template v-slot:item="{ item }">
            <v-breadcrumbs-item
              :disabled="item.disabled"
              :class="{ clickable: !item.disabled }"
              @click.stop="!item.disabled && pathClick(item.id)"
            >
              {{ item.name }}
            </v-breadcrumbs-item>
          </template>
        </v-breadcrumbs>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" sm="8" xs="9" class="pt-0">
        <v-btn
          class="my-1 mr-1"
          depressed
          color="primary"
          @click.stop="upload()"
          ><v-icon left>mdi-upload</v-icon>{{ $t("upload") }}</v-btn
        >
        <v-btn
          class="ma-1"
          color="primary"
          outlined
          :disabled="isCommitting"
          @click.stop="addFolderAction()"
          ><v-icon left>mdi-folder</v-icon>{{ $t("newFolder") }}</v-btn
        >
        <v-menu v-if="selectedFiles.length > 0" offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              class="ma-1"
              color="primary"
              outlined
              v-bind="attrs"
              v-on="on"
              ><v-icon left>mdi-dots-horizontal</v-icon>{{ $t("more") }}</v-btn
            >
          </template>
          <v-list dense>
            <v-list-item
              v-if="
                selectedFiles.length === 1 && selectedFiles[0].type !== 'folder'
              "
              @click="itemClick(selectedFiles[0], true)"
            >
              <v-icon left>mdi-download</v-icon>
              <v-list-item-title>{{ $t("download") }}</v-list-item-title>
            </v-list-item>
            <v-list-item :disabled="isCommitting" @click="moveAction()">
              <v-icon left>mdi-file-move</v-icon>
              <v-list-item-title>{{ $t("move") }}</v-list-item-title>
            </v-list-item>
            <v-list-item :disabled="isCommitting" @click="removeAction()">
              <v-icon left>mdi-trash-can-outline</v-icon>
              <v-list-item-title>{{ $t("delete") }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="selectedFiles.length === 1"
              :disabled="isCommitting"
              @click="renameAction(selectedFiles[0])"
            >
              <v-icon left>mdi-rename-box</v-icon>
              <v-list-item-title>{{ $t("rename") }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="selectedFiles.some((item) => item.type === 'file')"
              @click="copyDownloadLinks()"
            >
              <v-icon left>mdi-link</v-icon>
              <v-list-item-title>{{
                $t("copyDownloadLinks")
              }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="sendToAria2()">
              <v-icon left>mdi-auto-download</v-icon>
              <v-list-item-title>{{ $t("sendToAria2") }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
      <v-col cols="12" sm="4" xs="3" class="pt-0">
        <v-text-field
          v-model="searchText"
          class="py-0"
          :placeholder="$t('searchHint')"
          hide-details
          single-line
          clearable
        ></v-text-field>
      </v-col>
    </v-row>
    <v-data-table
      v-model="selectedFiles"
      class="transparent"
      :page.sync="listPage"
      :headers="fileListHeader"
      :items="displayList"
      :items-per-page="10"
      :search="searchText"
      item-key="name"
      show-select
      :footer-props="{
        showFirstLastPage: true,
        itemsPerPageOptions: [10, 50, 100, -1],
      }"
      :sort-by.sync="listSortBy"
      :sort-desc.sync="listSortDesc"
    >
      <template v-slot:[`item.name`]="{ item }">
        <v-icon v-if="item.type === 'folder'" color="amber lighten-2"
          >mdi-folder</v-icon
        >
        <v-icon v-else :color="item.name | iconColor">{{
          item.name | iconFormat
        }}</v-icon>
        <span class="clickable ml-1" @click.stop="itemClick(item)">
          {{ item.name }}
        </span>
      </template>
      <template v-slot:[`item.size`]="{ item }">
        {{ item.size | sizeFormat }}
      </template>
      <template v-slot:[`item.uploadTime`]="{ item }">
        {{ item.uploadTime | formatTime }}
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <v-btn
          v-if="item.type !== 'folder'"
          icon
          small
          @click.stop="itemClick(item, true)"
        >
          <v-icon small> mdi-download </v-icon>
        </v-btn>
        <v-menu offset-x>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on">
              <v-icon small>mdi-dots-horizontal</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item :disabled="isCommitting" @click="moveAction([item])">
              <v-icon left>mdi-file-move</v-icon>
              <v-list-item-title>{{ $t("move") }}</v-list-item-title>
            </v-list-item>
            <v-list-item :disabled="isCommitting" @click="removeAction([item])">
              <v-icon left>mdi-trash-can-outline</v-icon>
              <v-list-item-title>{{ $t("delete") }}</v-list-item-title>
            </v-list-item>
            <v-list-item :disabled="isCommitting" @click="renameAction(item)">
              <v-icon left>mdi-rename-box</v-icon>
              <v-list-item-title>{{ $t("rename") }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="item.type === 'file'"
              @click="copyDownloadLinks([item])"
            >
              <v-icon left>mdi-link</v-icon>
              <v-list-item-title>{{
                $t("copyDownloadLinks")
              }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="sendToAria2([item])">
              <v-icon left>mdi-auto-download</v-icon>
              <v-list-item-title>{{ $t("sendToAria2") }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </v-data-table>
    <video-player
      :source="source"
      :tracks="tracks"
      :show.sync="showVideo"
      :active-repository="activeRepository"
      @alert="alert"
    />
    <image-viewer
      :active-repository="activeRepository"
      :name="clickedItemName"
      :display-list="displayList"
      :list-sort-by="listSortBy"
      :list-sort-desc="listSortDesc"
      :search-text="searchText"
      :show.sync="showImage"
      @alert="alert"
      @login="login"
    />
    <v-dialog
      v-model="action"
      persistent
      scrollable
      :max-width="actionType === 'move' ? 600 : 400"
    >
      <v-card>
        <v-card-title>
          <span>{{
            actionType === "rename"
              ? $t("newName")
              : actionType === "addFolder"
              ? $t("newFolderName")
              : actionType === "move"
              ? $t("moveTo")
              : actionType === "remove"
              ? $t("deleteFile", [removeCounts])
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
                        !displayList.some(
                          (e) => renameItem.id !== e.id && e.name === v
                        ) || $t('duplicate'),
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
                <v-col
                  v-if="actionType === 'move' && action"
                  class="folder-tree"
                  cols="12"
                >
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
                      <v-icon color="amber lighten-2">
                        {{ open ? "mdi-folder-open" : "mdi-folder" }}
                      </v-icon>
                    </template>
                    <template v-slot:label="{ item }">
                      <div class="folder-tree-item" :title="item.name">
                        {{ item.name }}
                      </div>
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
            color="primary"
            :disabled="
              isCommitting ||
              (actionType === 'move' && selectedFolder.length === 0)
            "
            @click.stop="
              form.validate() &&
                (actionType === 'rename'
                  ? rename()
                  : actionType === 'addFolder'
                  ? addFolder()
                  : actionType === 'move'
                  ? move()
                  : actionType === 'remove' && removeSelected())
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
  <v-row v-else class="fill-height" align="center" justify="center">
    <v-card
      color="transparent"
      class="d-flex justify-center align-center"
      outlined
      style="border-style: dashed; border-color: #616161 !important"
      width="80%"
      height="80%"
    >
      <v-card-text class="text-center">
        <v-btn color="primary" to="/repositories?type=add"
          ><v-icon left>mdi-plus</v-icon>{{ $t("add") }}</v-btn
        >
      </v-card-text>
    </v-card>
  </v-row>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Emit, Ref, Watch } from 'vue-property-decorator';
import VideoPlayer from '@/components/VideoPlayer.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import { Repository, FileItem, Manifest, PathNode, VForm } from '@/utils/types';
import { sizeFormat, formatTime, iconFormat, iconColor } from '@/utils/filters';
import network from '@/utils/network';
import database from '@/utils/database';

interface FolderList {
  name: string;
  files: FolderList[];
  id: symbol;
  disabled: boolean;
}


@Component({
  components: {
    VideoPlayer,
    ImageViewer
  },
  filters: {
    sizeFormat,
    formatTime,
    iconFormat,
    iconColor
  }
})

export default class Files extends Vue {
  @Ref() private readonly form!: VForm
  @Ref() private readonly video!: HTMLMediaElement

  @Emit()
  private loading(): void { return; }
  @Emit()
  private loaded(): void { return; }
  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { ({ authenticateHeader, fn }); }
  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }
  @Emit()
  private upload(): PathNode[] { return this.currentPath; }

  @Prop(Array) private readonly repositories!: Repository[]
  @PropSync('active') private activeRepositoryID!: number
  @PropSync('committing') private isCommitting!: boolean

  private showVideo = false
  private showImage = false
  private source = { name: '', url: '' }
  private tracks: { name: string; url: string }[] = []
  private clickedItemName = ''
  private result = ''
  private action = false
  private actionType = ''
  private renameItem!: FileItem
  private removeItems: FileItem[] = []
  private removeCounts = 0
  private newName = ''
  private folderName = ''
  private listPage = 1
  private root: FileItem = { name: 'root', type: 'folder', files: [], id: Symbol() }
  private currentPath: PathNode[] = [{ name: `${this.$t('root')}`, disabled: true, id: Symbol() }]
  private layers: Manifest[] = []
  private uploadFiles: File[] = []
  private selectedFiles: FileItem[] = []
  private folderList: FolderList = { name: `${this.$t('root')}`, files: [], id: Symbol(), disabled: false }
  private moveItems: FileItem[] = []
  private selectedFolder: symbol[] = []
  private listSortBy: string | string[] | undefined = ''
  private listSortDesc: boolean | boolean[] | undefined = false
  private searchText = ''
  private readonly fileListHeader = [
    { text: this.$t('filename'), align: 'start', value: 'name' },
    { text: '', value: 'actions', sortable: false, filterable: false },
    { text: this.$t('fileSize'), value: 'size', sortable: false, filterable: false },
    { text: this.$t('fileUploadTime'), value: 'uploadTime', filterable: false },
  ]

  @Watch('activeRepository')
  private onActiveRepositoryChange(): void {
    this.getConfig();
  }
  @Watch('currentPath')
  private onCurrentPathChange(): void {
    this.listPage = 1;
    this.searchText = '';
  }
  @Watch('searchText')
  private onSearchTextChange(val: string): void {
    this.listPage = 1;
    if (val) this.selectedFiles = [];
  }

  private get displayList(): FileItem[] {
    return this.getPath(this.currentPath);
  }
  private get activeRepository(): Repository | undefined {
    return this.repositories.find(e => e.id === this.activeRepositoryID);
  }

  private created(): void {
    if (this.activeRepository) this.getConfig();
  }
  public async getConfig(holdPath = false, silent = false): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    if (!silent) this.loading();
    try {
      const { config, layers } = await network.getManifests(this.activeRepository);
      this.layers = layers;
      this.root.files = network.parseConfig(config);
      if (!silent) this.selectedFiles = [];
      if (!holdPath) {
        this.currentPath.splice(1);
        this.currentPath[0].disabled = true;
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.getConfig.bind(this));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    if (!silent) this.loaded();
  }
  private addFolderAction(): void {
    this.actionType = 'addFolder';
    this.action = true;
  }
  private async addFolder(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const name = this.folderName;
    this.closeForm();
    this.isCommitting = true;
    this.loading();
    try {
      if (this.activeRepository.useDatabase) {
        if (this.root.files && this.root.files.length > 0 && !this.root.files[0]._id) throw `${this.$t('database.notSynchronize')}`;
        // const config = await database.add([{
        await database.add([{
          paths: this.currentPath.slice(1).map(node => node.name),
          item: { name, type: 'folder', id: Symbol(), uploadTime: Date.now() }
        }], this.activeRepository);
        // await network.commit(config, this.activeRepository);
        // this.root.files = config.files;
        await this.getConfig(true, true);
      }
      else {
        const cache = { root: JSON.parse(JSON.stringify(this.root)) };
        this.getPath(this.currentPath, cache.root).push({ name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
        await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
        await this.getConfig(true, true);
      }
      this.selectedFiles = [];
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    this.loaded();
    this.isCommitting = false;
  }
  private async removeAction(removeItems = this.selectedFiles): Promise<void> {
    this.actionType = 'remove';
    this.removeItems = removeItems;
    this.removeCounts = this.getRemoveCount(removeItems).length;
    this.action = true;
  }
  private getRemoveCount(items: FileItem[]): { digest: string }[] {
    const result: { digest: string }[] = [];
    items.forEach(item => {
      if (item.type === 'file') result.push({ digest: item.digest as string });
      else if (item.type === 'folder') result.push(...this.getRemoveCount(item.files as FileItem[]));
    });
    return result;
  }
  private async removeSelected(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    this.closeForm();
    this.isCommitting = true;
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)), layers: JSON.parse(JSON.stringify(this.layers)) };
      if (this.activeRepository.useDatabase && this.root.files && this.root.files.length > 0 && !this.root.files[0]._id) throw `${this.$t('database.notSynchronize')}`;
      try {
        await this.remove(this.removeItems, this.currentPath, this.activeRepository, cache.root, cache.layers);
      }
      finally {
        if (this.activeRepository.useDatabase) {
          await database.remove(this.removeItems, this.activeRepository);
          // const config = await database.remove(this.removeItems, this.activeRepository);
          // await network.commit(config, this.activeRepository);
          // this.root.files = config.files;
          await this.getConfig(true, true);
        }
        else {
          await network.commit({ files: cache.root.files, layers: cache.layers }, this.activeRepository);
          await this.getConfig(true, true);
        }
        this.selectedFiles = [];
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.removeSelected.bind(this, this.removeItems));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    this.loaded();
    this.isCommitting = false;
  }
  private async remove(files: FileItem[], path: PathNode[], repository: Repository, root: FileItem, layers: Manifest[]): Promise<void> {
    const rootString = JSON.stringify(root);
    for (const file of files) {
      const currentPathFiles = this.getPath(path, root);
      if (file.type === 'file') {
        const digest = file.digest as string;
        const isSingleRelative = rootString.split(`"digest":"${digest}"`).length === 2;
        try {
          if (isSingleRelative)
            await network.removeFile(digest, repository);
        }
        catch (e) {
          if (e.response?.status !== 404) throw e;
        }
        if (isSingleRelative) {
          const layerIndex = layers.findIndex(e => e.digest === file.digest);
          if (layerIndex > -1) layers.splice(layerIndex, 1);
        }
      }
      else {
        await this.remove(file.files as FileItem[], [...path, { name: file.name, disabled: false, id: Symbol() }], repository, root, layers);
      }
      const index = currentPathFiles.findIndex(e => e.name === file.name);
      if (index > -1) currentPathFiles.splice(index, 1);
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
    this.isCommitting = true;
    this.loading();
    try {
      if (this.activeRepository.useDatabase) {
        if (!this.renameItem._id) throw `${this.$t('database.notSynchronize')}`;
        await database.rename(this.renameItem._id, name, this.activeRepository);
        // const config = await database.rename(this.renameItem._id, name, this.activeRepository);
        // await network.commit(config, this.activeRepository);
        // this.root.files = config.files;
        await this.getConfig(true, true);
      }
      else {
        const cache = { root: JSON.parse(JSON.stringify(this.root)) };
        const renameItem = this.getPath(this.currentPath, cache.root).find(e => e.name === this.renameItem.name);
        if (renameItem) renameItem.name = name;
        else throw `${this.$t('unknownError')}`;
        await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
        await this.getConfig(true, true);
      }
      this.selectedFiles = [];
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    this.loaded();
    this.isCommitting = false;
  }
  private moveAction(moveItems = this.selectedFiles): void {
    this.actionType = 'move';
    this.action = true;
    this.folderList.files = [];
    this.moveItems = moveItems;
    const filterFolder = (filterFiles: FolderList, rootFiles: FileItem): void => {
      for (const file of rootFiles.files as FileItem[]) {
        if (file.type === 'folder') {
          const filterFile = { name: file.name, files: [], id: Symbol(), disabled: this.selectedFiles.some(e => e.id === file.id) };
          if (filterFiles.files) filterFiles.files.push(filterFile);
          filterFolder(filterFile, file);
        }
      }
    };
    filterFolder(this.folderList, this.root);
  }
  private async move(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const getSelectedPath = (target: symbol, folderList: FolderList, path: PathNode[]): boolean => {
      path.push({ name: folderList.name, disabled: false, id: folderList.id });
      if (folderList.id === target || folderList.files.some(file => getSelectedPath(target, file, path))) return true;
      path.pop();
      return false;
    };
    const dPath: PathNode[] = [];
    getSelectedPath(this.selectedFolder[0], this.folderList, dPath);
    this.closeForm();
    if (dPath.length === this.currentPath.length && dPath.every((e, i) => e.name === this.currentPath[i].name)) return;
    this.isCommitting = true;
    this.loading();
    try {
      if (this.activeRepository.useDatabase) {
        if (this.root.files && this.root.files.length > 0 && !this.root.files[0]._id) throw `${this.$t('database.notSynchronize')}`;
        let dFolderId = null;
        const dFolder = dPath.pop() as PathNode;
        if (dFolder) dFolderId = this.getPath(dPath).find(file => file.name === dFolder.name)?._id ?? null;
        try {
          await database.move(this.moveItems.map(file => file._id as string), dFolderId, this.activeRepository);
          // const config = await database.move(this.moveItems.map(file => file._id as string), dFolderId, this.activeRepository);
          // await network.commit(config, this.activeRepository);
          // this.root.files = config.files;
          await this.getConfig(true, true);
        }
        catch (e) {
          // const config = await database.list(this.activeRepository);
          // await network.commit(config, this.activeRepository);
          // this.root.files = config.files;
          await this.getConfig(true, true);
          throw 'someFilenameConflict';
        }
      }
      else {
        const cache = { root: JSON.parse(JSON.stringify(this.root)) };
        const dFolder = this.getPath(dPath, cache.root);
        const sFolder = this.getPath(this.currentPath, cache.root);
        const failFiles: FileItem[] = [];
        this.moveItems.forEach(file => {
          const index = sFolder.findIndex(e => e.name === file.name);
          if (dFolder.some(e => e.name === file.name)) failFiles.push(file);
          else if (index > -1) dFolder.push(...sFolder.splice(index, 1));
        });
        await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
        await this.getConfig(true, true);
        if (failFiles.length > 0) throw 'someFilenameConflict';
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    this.selectedFiles = [];
    this.loaded();
    this.isCommitting = false;
  }
  private async copyDownloadLinks(items = this.selectedFiles): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    this.loading();
    try {
      const downloadLinks: string[] = [];
      for (const item of items) {
        if (item.digest && item.type === 'file') downloadLinks.push(await network.getDownloadURL(item.digest, this.activeRepository));
      }
      await navigator.clipboard.writeText(downloadLinks.join('\r\n'));
      this.alert(`${this.$t('copyDownloadLinksResult', [downloadLinks.length])}`, 'success');
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.copyDownloadLinks.bind(this, items));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    this.loaded();
  }
  private getPath(path: PathNode[], root?: FileItem): FileItem[] {
    let filePointer: FileItem = root ? root : this.root;
    path.slice(1).forEach(pathNode => {
      const nextPointer = filePointer.files?.find(e => e.name === pathNode.name);
      if (nextPointer?.type === 'folder') filePointer = nextPointer;
      else {
        return (root ? root.files : this.root.files) as FileItem[];
      }
    });
    return filePointer.files ?? [];
  }
  private async itemClick(item: FileItem, forceDownload = false): Promise<void> {
    if (item.type === 'file') {
      if (!item.digest || !this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
      this.loading();
      this.clickedItemName = item.name;
      try {
        if (forceDownload) {
          this.sendToBrowser(await network.getDownloadURL(item.digest, this.activeRepository), item.name);
        }
        else if (/\.(jpg|png|gif|bmp|webp|ico)$/.test(item.name.toLowerCase())) {
          this.loaded();
          this.showImage = true;
        }
        else if (/\.(mp4|mkv|avi)$/.test(item.name.toLowerCase())) {
          Object.assign(this.source, { name: item.name, url: await network.getDownloadURL(item.digest, this.activeRepository) });
          const subtitles = this.displayList.filter(e => e.name.includes(item.name.substr(0, item.name.length - 3)) && /.*\.(vtt|srt|ass|ssa)$/.test(e.name));
          this.tracks = [];
          for (const subtitle of subtitles) {
            this.tracks.push({ name: subtitle.name, url: subtitle.digest as string });
          }
          this.showVideo = true;
        }
        else this.sendToBrowser(await network.getDownloadURL(item.digest, this.activeRepository), item.name);
      }
      catch (error) {
        if (error?.message === 'need login') this.login(error.authenticateHeader, this.itemClick.bind(this, item, forceDownload));
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
      }
      this.loaded();
    }
    else {
      this.selectedFiles = [];
      this.currentPath[this.currentPath.length - 1].disabled = false;
      this.currentPath.push({ name: item.name, disabled: true, id: Symbol() });
    }
  }
  private pathClick(id: symbol): void {
    this.selectedFiles = [];
    const currentIndex = this.currentPath.findIndex(e => e.id === id);
    if (currentIndex > -1) {
      this.currentPath.splice(currentIndex + 1);
      this.currentPath[this.currentPath.length - 1].disabled = true;
    }
  }
  private closeForm(): void {
    this.form.reset();
    this.form.resetValidation();
    this.selectedFolder = [];
    this.action = false;
  }
  private async sendToAria2(items = this.selectedFiles): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    try {
      const info = this.generateDownloadInfo(items, '');
      const { success, fail } = await network.sentToAria2(info, this.activeRepository);
      this.alert(`${this.$t('sendResult', [success, fail])}`);
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.sendToAria2.bind(this, items));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
  }
  private sendToBrowser(url: string, filename: string): void {
    chrome.downloads.download({ url, filename: filename.replace(/[\\/:*?"<>|]/g, '') });
    this.alert(`${this.$t('sendToBrowser')}`, 'success');
  }
  private generateDownloadInfo(items: FileItem[], path: string): { name: string; digest: string }[] {
    const result: { name: string; digest: string }[] = [];
    items.forEach(item => {
      if (item.type === 'file') result.push({ name: `${path}${item.name.replace(/[\\/*?:<>|"]/g, '')}`, digest: item.digest as string });
      else if (item.type === 'folder') result.push(...this.generateDownloadInfo(item.files as FileItem[], `${path}${item.name.replaceAll('/', '')}/`));
    });
    return result;
  }
  private async refresh(): Promise<void> {
    this.loading();
    try {

      if (this.activeRepository?.useDatabase) {
        await database.synchronize(this.activeRepository);
        // const config = await database.list(this.activeRepository);
        // await network.commit(config, this.activeRepository);
        // this.root.files = config.files;
        await this.getConfig(true, true);
      }
      else await this.getConfig();
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
    this.loaded();
  }
}
</script>

<style scoped lang="scss">
.clickable {
  cursor: pointer;
}
.folder-tree {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
}
.folder-tree-item {
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>