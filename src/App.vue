<template>
  <v-app id="app">
    <v-navigation-drawer v-model="drawer" app>
      <v-list>
        <v-list-item>
          <v-list-item-avatar size="50">
            <v-icon large color="blue lighten-1">mdi-database-import</v-icon>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title class="text-h5">{{
              $t("name")
            }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>

      <v-divider></v-divider>

      <v-list nav dense>
        <v-list-item key="files" to="/" link>
          <v-list-item-icon>
            <v-icon>mdi-file-multiple</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ $t("files") }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item key="repositories" to="/repositories" link>
          <v-list-item-icon>
            <v-icon>mdi-database-settings</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ $t("repositories") }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item key="settings" to="/settings" link>
          <v-list-item-icon>
            <v-icon>mdi-cogs</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ $t("settings") }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app absolute elevate-on-scroll scroll-target="#main-container">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ $t("name") }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click.stop="taskListPanel = !taskListPanel">
        <v-badge
          :value="runningTask !== 0"
          color="green"
          overlap
          :content="runningTask"
        >
          <v-icon>mdi-calendar-check-outline</v-icon>
        </v-badge>
      </v-btn>
    </v-app-bar>

    <v-main id="main" class="grey darken-3">
      <v-container
        id="main-container"
        class="py-8 px-6 overflow-y-auto overflow-x-hidden"
        fluid
      >
        <v-fade-transition mode="out-in">
          <router-view
            ref="child"
            :repositories="repositories"
            :active.sync="active"
            :committing.sync="isCommitting"
            @loading="loading = true"
            @loaded="loading = false"
            @login="loginAction"
            @alert="showAlert"
            @upload="selectFiles"
            @add="addRepository"
            @edit="editRepository"
            @delete="deleteRepository"
          />
        </v-fade-transition>
      </v-container>
    </v-main>

    <v-navigation-drawer
      v-model="taskListPanel"
      right
      temporary
      absolute
      :width="500"
      style="max-width: 90vw"
    >
      <v-row class="ma-0">
        <v-col>
          <div class="text-h5 my-3">{{ $t("taskList") }}</div>
        </v-col>
        <v-col class="d-flex justify-end align-center">
          <v-tooltip bottom :open-delay="600">
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                v-bind="attrs"
                v-on="on"
                @click.stop="clearCompleteTask()"
              >
                <v-icon>mdi-notification-clear-all</v-icon>
              </v-btn>
            </template>
            <span>{{ $t("clearComplete") }}</span>
          </v-tooltip>
        </v-col>
      </v-row>
      <v-list>
        <template v-for="(task, index) in taskList">
          <v-list-item :key="task.id" class="my-2">
            <v-list-item-content>
              <v-list-item-title v-bind="attrs" v-on="on"
                ><v-icon left :color="task.name | iconColor" size="20">{{
                  task.name | iconFormat
                }}</v-icon
                >{{ task.name }}</v-list-item-title
              >
              <v-list-item-subtitle>
                <v-progress-linear
                  :color="
                    task.status === 'cancel'
                      ? 'warning'
                      : task.status === 'uploading' ||
                        task.status === 'hashing' ||
                        task.status === 'waiting'
                      ? 'primary'
                      : task.status === 'complete'
                      ? 'success'
                      : 'error'
                  "
                  :value="task.progress | progressPercentage"
                  height="25"
                >
                  <strong v-if="task.status === 'uploading'">{{
                    task.progress | progressPercentage
                  }}</strong>
                  <strong v-else>{{ $t(task.status) }}</strong>
                </v-progress-linear>
              </v-list-item-subtitle>

              <v-list-item-subtitle>
                <div
                  :class="[
                    'd-flex',
                    task.status === 'uploading'
                      ? 'justify-space-between'
                      : 'justify-end',
                  ]"
                  style="width: 100%"
                >
                  <strong v-if="task.status === 'uploading'"
                    >{{ task.speed | sizeFormat }}{{ "/s"
                    }}{{ remainingFormat(task.remainingTime) }}</strong
                  >
                  <strong v-if="task.status === 'uploading'">
                    {{ task.progress.uploadedSize | sizeFormat
                    }}{{ task.status === "uploading" ? "/" : ""
                    }}{{ task.progress.totalSize | sizeFormat }}</strong
                  >
                  <strong v-else>{{
                    task.progress.totalSize | sizeFormat
                  }}</strong>
                </div>
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-btn
                icon
                small
                :disabled="
                  task.status !== 'uploading' && task.status !== 'waiting'
                "
                @click.stop="cancelTask(task)"
              >
                <v-icon small>mdi-close</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
          <v-divider
            v-if="index < taskList.length - 1"
            :key="index"
            inset
          ></v-divider>
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-dialog
      v-model="action"
      persistent
      scrollable
      :max-width="actionType === 'login' ? 400 : 600"
      :fullscreen="actionType === 'selectFiles'"
    >
      <v-card class="overflow-hidden">
        <v-card-title>
          <span v-if="actionType === 'login'">{{ $t("needLogin") }}</span>
          <template v-if="actionType === 'selectFiles'">
            <v-btn color="blue darken-1" @click.stop="getFiles.click()">
              {{ $t("selectFiles") }}
            </v-btn>
            <v-btn color="blue darken-1 ml-4" @click.stop="getFolder.click()">
              {{ $t("selectFolder") }}
            </v-btn>
          </template>
        </v-card-title>
        <v-card-text class="overflow-x-hidden">
          <v-container>
            <v-form ref="form" lazy-validation>
              <v-row v-if="actionType === 'login'">
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
            <v-row v-if="actionType === 'selectFiles'">
              <v-col cols="12">
                <v-list v-if="uploadFiles.length > 0">
                  <v-slide-x-transition
                    leave-absolute
                    group
                    class="relative-parent"
                  >
                    <template v-for="(file, index) in uploadFiles">
                      <upload-file-list-item
                        :key="file.name"
                        :file="file"
                        :path="currentPath.map((path) => path.name).join('/')"
                        @delete-item="uploadFiles.splice(index, 1)"
                      ></upload-file-list-item>
                      <v-divider
                        v-if="index < uploadFiles.length - 1"
                        :key="`${file.name}-${file.size}`"
                        inset
                      ></v-divider>
                    </template>
                  </v-slide-x-transition>
                </v-list>
                <input
                  v-show="false"
                  v-if="actionType === 'selectFiles'"
                  id="getFiles"
                  ref="getFiles"
                  type="file"
                  name="files"
                  multiple
                  @input="onSelectFiles('getFiles')"
                />
                <input
                  v-show="false"
                  v-if="actionType === 'selectFiles'"
                  id="getFolder"
                  ref="getFolder"
                  type="file"
                  name="folder"
                  webkitdirectory
                  @input="onSelectFiles('getFolder')"
                />
              </v-col>
            </v-row>
          </v-container>
          <v-row
            v-if="actionType === 'selectFiles' && uploadFiles.length === 0"
            class="fill-height"
            justify="center"
          >
            <v-card flat width="100%" class="d-flex pa-15">
              <v-card-text
                class="d-flex justify-center align-center"
                style="border: 1px dashed"
              >
                <div>{{ $t("selectFilesHit") }}</div>
              </v-card-text>
            </v-card>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            @click.stop="
              form.validate() &&
                (actionType === 'login' ? login() : addToTaskList())
            "
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn
            color="error"
            text
            @click.stop="actionType === 'login' ? closeForm(true) : closeForm()"
          >
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-overlay :z-index="201" :value="loading">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      ></v-progress-circular>
    </v-overlay>
    <v-snackbar
      v-for="(alert, index) in alerts"
      :key="index"
      v-model="alert.show"
      :color="alert.type"
      :timeout="5000"
      top
      right
      transition="slide-x-reverse-transition"
      :style="`margin-top: ${index * 64}px`"
    >
      {{ alert.text }}
    </v-snackbar>
  </v-app>
</template>

<script lang="ts">
import { Vue, Component, Ref, Watch } from 'vue-property-decorator';
import axios, { CancelTokenSource } from 'axios';
import { Repository, FileItem, PathNode, VForm } from '@/utils/types';
import { sizeFormat, progressPercentage, iconFormat, iconColor } from '@/utils/filters';
import network from '@/utils/network';
import hashWorker from '@/utils/hash.worker';
import storage from '@/utils/storage';
import Files from '@/views/Files.vue';
import UploadFileListItem from '@/components/UploadFileListItem.vue';

interface Task {
  id: symbol;
  name: string;
  file: File | undefined;
  status: string;
  progress: {
    uploadedSize: number;
    totalSize: number;
  };
  speed: number;
  remainingTime: number;
  path: PathNode[];
  lastUpdate: {
    time: number;
    size: number;
  };
  timer?: number | NodeJS.Timeout;
  cancelToken: CancelTokenSource;
  hashWorker?: Worker;
}

@Component({
  components: {
    UploadFileListItem
  },
  filters: {
    sizeFormat,
    progressPercentage,
    iconFormat,
    iconColor
  }
})

export default class APP extends Vue {
  @Ref() private readonly child!: Files
  @Ref() private readonly form!: VForm
  @Ref() private readonly getFiles!: HTMLInputElement
  @Ref() private readonly getFolder!: HTMLInputElement

  private loading = false
  private isCommitting = false;
  private drawer = true
  private taskListPanel = false
  private taskList: Task[] = []
  private repositories: Repository[] = []
  private active = 0
  private action = false
  private actionType = ''
  private beforeLogin!: { authenticateHeader: string | undefined; fn: Function | undefined }
  private username = ''
  private password = ''
  private alert = false
  private alerts: { show: boolean; text: string; type: string }[] = []
  private alertText = ''
  private alertColor = ''
  private uploadFiles: File[] = []
  private currentPath: PathNode[] = []

  private get runningTask(): number {
    return this.taskList.filter(e => e.status === 'uploading' || e.status === 'hashing' || e.status === 'waiting').length;
  }

  @Watch('runningTask')
  private onTaskListChange(val: number): void {
    if (val === 0) onbeforeunload = null;
    else onbeforeunload = (): string => '';
    if (this.taskList.some(e => e.status === 'uploading')) return;
    else {
      const waitingTask = this.taskList.find(e => e.status === 'waiting');
      if (waitingTask) {
        waitingTask.status = 'uploading';
        this.upload(waitingTask);
      }
    }
  }
  @Watch('active')
  private onActiveChange(val: number): void {
    storage.setValue('active', val);
  }

  private async created(): Promise<void> {
    document.title = `${this.$t('name')}`;
    const { repositories } = await storage.getValue('repositories');
    const { active } = await storage.getValue('active');
    if (repositories) {
      this.repositories.push(...repositories);
      this.active = active;
    }
  }
  private loginAction(authenticateHeader?: string, fn?: Function): void {
    this.actionType = 'login';
    this.action = true;
    this.beforeLogin = { authenticateHeader, fn };
  }
  private async login(): Promise<void> {
    const activeRepository = this.repositories.find(e => e.id === this.active);
    if (!activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    activeRepository.secret = btoa(`${this.username}:${this.password}`);
    await storage.setValue('repositories', this.repositories);
    this.closeForm();
    this.loading = true;
    if (this.beforeLogin.authenticateHeader) {
      try {
        const token = await network.getToken(this.beforeLogin.authenticateHeader, activeRepository);
        if (token) activeRepository.token = token;
      }
      catch (error) {
        if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
        else this.showAlert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      }
    }
    this.loading = false;
    if (this.beforeLogin.fn) this.beforeLogin.fn();
  }
  private getPath(path: PathNode[], files: FileItem[]): FileItem[] {
    const cacheRoot = { name: 'root', type: 'folder', files, id: Symbol() };
    let filePointer: FileItem = cacheRoot;
    path.slice(1).forEach(pathNode => {
      let nextPointer = filePointer.files?.find(e => e.name === pathNode.name);
      if (!nextPointer) {
        nextPointer = { name: pathNode.name, type: 'folder', id: Symbol(), files: [], uploadTime: Date.now() };
        filePointer.files?.push(nextPointer);
      }
      else if (nextPointer.type !== 'folder') {
        let i = 1;
        while (filePointer.files?.some(e => e.name === `${pathNode.name} (${i})`)) i++;
        nextPointer = { name: `${pathNode.name} (${i})`, type: 'folder', id: Symbol(), files: [], uploadTime: Date.now() };
        filePointer.files?.push(nextPointer);
      }
      filePointer = nextPointer;
    });
    return filePointer.files ?? [];
  }
  private selectFiles(currentPath: PathNode[]): void {
    this.currentPath = [...currentPath];
    this.actionType = 'selectFiles';
    this.action = true;
  }
  private onSelectFiles(type: 'getFiles' | 'getFolder'): void {
    if (this[type].files) this.uploadFiles = [...(this[type].files as FileList)];
    else this.uploadFiles = [];
    this[type].value = '';
  }
  private addToTaskList(): void {
    this.uploadFiles.forEach(file => {
      const path: PathNode[] = [...this.currentPath];
      /*@ts-ignore*/
      const stringPath: string = file.webkitRelativePath;
      if (stringPath !== '') path.push(...stringPath.split('/').slice(0, -1).map(e => ({ name: e, disabled: false, id: Symbol() })));
      const task: Task = {
        id: Symbol(),
        name: file.name,
        file,
        status: 'waiting',
        progress: {
          uploadedSize: 0,
          totalSize: file.size,
        },
        speed: 0,
        remainingTime: 0,
        path,
        lastUpdate: {
          time: 0,
          size: 0
        },
        cancelToken: axios.CancelToken.source()
      };
      this.taskList.push(task);
    });
    this.closeForm();
  }
  private async upload(task: Task): Promise<void> {
    const activeRepository = this.repositories.find(e => e.id === this.active);
    if (!activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    try {
      task.hashWorker = new hashWorker();
      task.timer = setInterval(() => {
        const now = Date.now() / 1000;
        task.speed = (task.progress.uploadedSize - task.lastUpdate.size) / (now - task.lastUpdate.time);
        task.lastUpdate.time = now;
        task.lastUpdate.size = task.progress.uploadedSize;
      }, 1000);
      const { digest, size } = await network.uploadFile(task.file as File, activeRepository, this.onUploadProgress.bind(this, task), task.cancelToken, task.hashWorker as Worker);
      while (this.isCommitting) await new Promise(res => setTimeout(() => res(''), 1000));
      this.isCommitting = true;
      task.status = 'hashing';
      task.file = undefined;
      const { config, layers } = await network.getManifests(activeRepository);
      if (layers.some(e => e.digest === digest)) throw 'fileExisted';
      const files = network.parseConfig(config);
      const path = this.getPath(task.path, files);
      if (path.some(e => e.name === task.name)) {
        let i = 1;
        let [, name, ext] = task.name.match(/(.*)(\.[^.]*)$/) ?? [];
        if (!name) {
          name = task.name;
          ext = '';
        }
        while (path.some(e => e.name === `${name} (${i})${ext}`)) {
          i++;
        }
        task.name = `${name} (${i})${ext}`;
      }
      path.push({ name: task.name, digest, size, type: 'file', uploadTime: Date.now(), id: Symbol() });
      layers.push({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest, size });
      await network.commit({ files, layers }, activeRepository);
      if (this.child.getConfig) await this.child.getConfig(true, true);
      task.status = 'complete';
    }
    catch (error) {
      if (error.message === 'need login') this.loginAction(error.authenticateHeader, this.upload.bind(this, task));
      else if (error.message !== 'manually cancel') {
        task.cancelToken.cancel();
        task.file = undefined;
        if (typeof error === 'string') task.status = `${this.$t('uploadError')}${this.$t(error)}`;
        else task.status = `${this.$t('unknownError')}${error.toString()}`;
      }
      clearInterval(task.timer as number);
      task.hashWorker?.terminate();
    }
    finally {
      this.isCommitting = false;
    }
  }
  private onUploadProgress(task: Task, e: ProgressEvent): void {
    const { loaded } = e;
    if (!task) return;
    task.progress.uploadedSize = loaded;
    task.remainingTime = (task.progress.totalSize - loaded) / task.speed;
    if (task.progress.totalSize - loaded === 0) {
      task.status = 'hashing';
      task.file = undefined;
      clearInterval(task.timer as number);
    }
  }
  private cancelTask(task: Task): void {
    if (task.status === 'uploading') {
      task.cancelToken.cancel('manually cancel');
    }
    task.status = 'cancel';
    task.file = undefined;
  }
  private async addRepository(newRepository: Repository): Promise<void> {
    const { name, url, id, secret, token } = newRepository;
    this.repositories.push({ name, url, id, secret, token });
    await storage.setValue('repositories', this.repositories);
    this.active = id;
  }
  private async editRepository(newRepository: Repository): Promise<void> {
    const { name, url, id, secret } = newRepository;
    const repository = this.repositories.find(e => e.id === id) as Repository;
    repository.name = name;
    repository.url = url;
    if (secret) repository.secret = secret;
    await storage.setValue('repositories', this.repositories);
  }
  private async deleteRepository(id: number): Promise<void> {
    this.repositories.splice(this.repositories.findIndex(e => e.id === id), 1);
    if (this.active === id) this.active = this.repositories[0]?.id ?? 0;
    await storage.setValue('repositories', this.repositories);
  }
  private clearCompleteTask(): void {
    this.taskList = this.taskList.filter(e => e.status !== 'complete');
  }
  private closeForm(cancelTask = false): void {
    this.form.reset();
    this.form.resetValidation();
    this.action = false;
    if (this.actionType === 'selectFiles') {
      this.uploadFiles = [];
      this.currentPath = [];
    }
    if (cancelTask) this.taskList.forEach(task => {
      task.status = 'cancel';
      task.file = undefined;
    });
  }
  private showAlert(text: string, type = ''): void {
    const freeAlert = this.alerts.find(alert => alert.show === false);
    const newAlert = { show: false, text, type };
    if (freeAlert) {
      newAlert.show = true;
      Object.assign(freeAlert, newAlert);
    }
    else {
      this.alerts.push(newAlert);
      this.$nextTick(() => newAlert.show = true);
    }
  }
  private remainingFormat(remainingTime: number): string {
    if (!remainingTime) return '';
    let timeString = '';
    if (remainingTime < 60) timeString = ` ${remainingTime.toFixed(0)}${this.$t('second')}`;
    else if (remainingTime < 60 * 60) timeString = ` ${(remainingTime / 60).toFixed(0)}${this.$t('minute')}`;
    else timeString = `${this.$t('over1h')}`;
    return ` ( ${this.$t('remaining', [timeString])} ) `;
  }
}
</script>

<style scoped lang="scss">
.relative-parent {
  position: relative;
}
.v-divider.slide-x-transition-move {
  transition: transform 0.6s;
}
</style>