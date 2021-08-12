<template>
  <v-app id="app">
    <v-navigation-drawer v-model="drawer" app floating>
      <template v-slot:prepend>
        <v-toolbar class="top-bar" flat>
          <v-icon large color="blue lighten-1">mdi-database-import</v-icon>
          <v-toolbar-title class="pl-5">{{ $t("name") }}</v-toolbar-title>
        </v-toolbar>
      </template>

      <v-list nav dense>
        <v-list-item-group color="primary">
          <v-list-item key="files" to="/files">
            <v-list-item-icon>
              <v-icon>mdi-file-multiple</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ $t("files") }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item key="repositories" to="/repositories">
            <v-list-item-icon>
              <v-icon>mdi-database-cog</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ $t("repositories") }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item key="tasks" to="/tasks">
            <v-list-item-icon>
              <v-icon>mdi-text-box-multiple</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ $t("tasks") }}</v-list-item-title>
            </v-list-item-content>
            <v-list-item-icon class="align-center">
              <v-badge
                :value="runningTask !== 0"
                color="green"
                overlap
                :content="runningTask"
                inline
              ></v-badge>
            </v-list-item-icon>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app class="top-bar" flat>
      <v-app-bar-nav-icon
        class="hidden-lg-and-up"
        @click.stop="drawer = !drawer"
      >
        <template v-slot:default>
          <v-badge
            :value="runningTask !== 0"
            color="green"
            overlap
            dot
            bordered
          >
            <v-icon>mdi-menu</v-icon>
          </v-badge>
        </template>
      </v-app-bar-nav-icon>
      <v-toolbar-title class="hidden-lg-and-up">{{
        $t("name")
      }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-tooltip bottom :open-delay="300">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
            @click.stop="settingPanel = !settingPanel"
          >
            <v-icon>mdi-cog-outline</v-icon>
          </v-btn>
        </template>
        <span>{{ $t("settings") }}</span>
      </v-tooltip>
    </v-app-bar>

    <v-main id="main">
      <v-container id="main-container" class="py-8 px-6" fluid>
        <v-fade-transition mode="out-in">
          <router-view
            ref="child"
            :committing.sync="isCommitting"
            :task-list="taskList"
            :state="loading"
            @loading="loading = true"
            @loaded="loading = false"
            @login="loginAction"
            @alert="showAlert"
            @upload="addToTaskList"
            @cancel="cancelTask"
          />
        </v-fade-transition>
      </v-container>
    </v-main>

    <v-navigation-drawer
      v-model="settingPanel"
      :width="300"
      right
      temporary
      absolute
    >
      <template v-slot:prepend>
        <v-toolbar class="top-bar" flat>
          <v-toolbar-title>{{ $t("settings") }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon @click.stop="settingPanel = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
      </template>
      <v-container class="px-4">
        <div class="text-subtitle-2 font-weight-black">
          {{ $t("theme") }}
        </div>
        <v-item-group v-model="theme" mandatory>
          <v-row dense>
            <v-col
              v-for="(n, index) in ['dark', 'light', 'browser', 'time']"
              :key="n"
              cols="6"
            >
              <v-item v-slot="{ active, toggle }" :value="n">
                <v-card
                  :color="active ? 'primary' : 'grey'"
                  :class="`${
                    active
                      ? ''
                      : $vuetify.theme.dark
                      ? ' darken-3'
                      : ' lighten-3'
                  }`"
                  :dark="$vuetify.theme.dark || active"
                  flat
                  @click.stop="toggle"
                >
                  <v-list-item class="justify-space-between no-after" link
                    >{{ $t(n)
                    }}<v-icon>{{
                      [
                        "mdi-white-balance-sunny",
                        "mdi-weather-night",
                        "mdi-desktop-tower-monitor",
                        "mdi-theme-light-dark",
                      ][index]
                    }}</v-icon></v-list-item
                  >
                </v-card>
              </v-item>
            </v-col>
          </v-row>
        </v-item-group>
        <div class="mx-n4 mt-4 mb-3"><v-divider></v-divider></div>
        <div class="text-subtitle-2 font-weight-black">Aria2</div>
        <v-row class="mt-1" no-gutters>
          <v-col cols="12">
            <v-select
              :items="[{ text: 'POST', value: 'post' }]"
              value="post"
              :label="$t('RPC.requestMethod')"
              outlined
              dense
              disabled
            ></v-select>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="address"
              :rules="[
                (v) => !v || /https?:\/\//.test(v) || $t('RPC.addressProtocol'),
              ]"
              :label="$t('RPC.address')"
              outlined
              dense
              placeholder="http://localhost:6800/jsonrpc"
              @change="onAria2SettingChange"
              @update:error="aria2AddressError = $event"
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="secret"
              :label="$t('RPC.secret')"
              type="password"
              outlined
              dense
              @change="onAria2SettingChange"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-container>
    </v-navigation-drawer>

    <v-dialog v-model="action" persistent scrollable :max-width="400">
      <v-card>
        <v-card-title>{{
          formValue.type === "login" && $t("needLogin")
        }}</v-card-title>
        <v-card-text class="py-0">
          <v-container class="px-0">
            <v-form ref="form" v-model="formValidation">
              <v-row v-if="formValue.type === 'login'" no-gutters>
                <v-col cols="12">
                  <v-text-field
                    v-model="formValue.username"
                    outlined
                    dense
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  >
                    <template v-slot:label>
                      {{ $t("account") }}<span class="red--text">*</span>
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="formValue.password"
                    outlined
                    dense
                    :rules="[(v) => !!v || $t('require')]"
                    type="password"
                    required
                  >
                    <template v-slot:label>
                      {{ $t("password") }}<span class="red--text">*</span>
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            :disabled="!formValidation"
            depressed
            @click.stop="formValue.type === 'login' && login()"
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn color="error" text @click.stop="action = false">
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
import axios from 'axios';
import { Repository, FileItem, VForm, Task } from '@/utils/types';
import { sizeFormat, progressPercentage, iconFormat, iconColor } from '@/utils/filters';
import network from '@/utils/network';
import hashWorker from '@/utils/hash.worker';
import storage from '@/utils/storage';
import Files from '@/views/Files.vue';
import database from '@/utils/database';
import { getID } from '@/utils/id-generator';

@Component({
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
  private taskPage = 1
  private taskPageLength = 1
  private settingPanel = false
  private theme = 'browser'
  private address = ''
  private secret = ''
  private aria2AddressError = false
  private uploadPage = 1
  private uploadPageLength = 1
  private action = false
  private readonly defaultFormValue: { type: string; username: string; password: string } = {
    type: '',
    username: '',
    password: ''
  }
  private formValue = Object.assign({}, this.defaultFormValue)
  private formValidation = true
  private beforeLogin!: { authenticateHeader: string | undefined; fn: Function | undefined }
  private alert = false
  private alerts: { show: boolean; text: string; type: string; shown: boolean }[] = []
  private alertText = ''
  private alertColor = ''

  private get runningTask(): number {
    return this.taskList.filter(e => e.status === 'uploading' || e.status === 'hashing' || e.status === 'waiting').length;
  }
  private get operating(): boolean {
    return this.runningTask > 0 || this.isCommitting;
  }

  @Watch('runningTask')
  private onTaskListChange(): void {
    if (this.taskList.some(e => e.status === 'uploading' || e.status === 'hashing')) return;
    else {
      const waitingTask = this.taskList.find(e => e.status === 'waiting');
      if (waitingTask) {
        waitingTask.status = 'uploading';
        this.upload(waitingTask);
      }
    }
  }
  @Watch('operating')
  private onOperatingChange(val: boolean): void {
    if (val) onbeforeunload = (): string => '';
    else onbeforeunload = null;
  }
  @Watch('theme')
  private onThemeChange(val: string): void {
    this.setTheme(val);
    storage.setValue('theme', this.theme);
  }
  @Watch('uploadPage')
  private onUploadPageChange(): void {
    this.$vuetify.goTo(0, {
      container: '#upload-files-container',
      duration: 0
    });
  }

  private async created(): Promise<void> {
    document.title = `${this.$t('name')}`;
    this.drawer = !this.$vuetify.breakpoint.mobile;
    this.theme = await storage.getTheme();
    const aria2 = await storage.getAria2Config();
    this.address = aria2?.address ?? '';
    this.secret = aria2?.secret ?? '';
  }
  private async getActiveRepository(): Promise<Repository | undefined> {
    const repositories = await storage.getRepositories();
    const active = await storage.getActiveID();
    return repositories.find(e => e.id === active);
  }
  private setTheme(theme: string): void {
    if (theme === 'browser') {
      const { matches } = window.matchMedia('(prefers-color-scheme: dark)');
      if (matches) this.$vuetify.theme.dark = true;
      else this.$vuetify.theme.dark = false;
    }
    else if (theme === 'time') {
      const hour = new Date().getHours();
      this.$vuetify.theme.dark = hour >= 18 || hour < 6;
    }
    else if (theme === 'dark') this.$vuetify.theme.dark = true;
    else this.$vuetify.theme.dark = false;
  }
  private loginAction(authenticateHeader?: string, fn?: Function): void {
    this.resetForm({ type: 'login' });
    this.action = true;
    this.beforeLogin = { authenticateHeader, fn };
  }
  private async login(): Promise<void> {
    this.action = false;
    this.loading = true;
    const repositories = await storage.getRepositories();
    const active = await storage.getActiveID();
    const activeRepository = repositories.find(e => e.id === active);
    if (!activeRepository) {
      this.loading = false;
      return this.showAlert(`${this.$t('getRepositoryFailed')}`, 'error');
    }
    activeRepository.secret = btoa(`${this.formValue.username}:${this.formValue.password}`);
    await storage.setValue('repositories', repositories);
    if (this.beforeLogin.authenticateHeader) {
      try {
        const token = await network.getToken(this.beforeLogin.authenticateHeader, activeRepository);
        if (token) await storage.setRepositoryToken(activeRepository.id, token);
      }
      catch (error) {
        if (typeof error === 'string') this.showAlert(`${this.$t(error)}`, 'error');
        else this.showAlert(`${this.$t('unknownError')}`, 'error', error);
      }
    }
    this.loading = false;
    if (this.beforeLogin.fn) this.beforeLogin.fn();
  }
  private getPath(path: string[], files: FileItem[]): FileItem[] {
    const cacheRoot: FileItem = { name: 'root', type: 'folder', files, id: getID() };
    let filePointer = cacheRoot;
    path.slice(1).forEach(pathNode => {
      let nextPointer = filePointer.files?.find(e => e.name === pathNode);
      if (!nextPointer) {
        nextPointer = { name: pathNode, type: 'folder', id: getID(), files: [], uploadTime: Date.now() };
        filePointer.files?.push(nextPointer);
      }
      else if (nextPointer.type !== 'folder') {
        let i = 1;
        while (filePointer.files?.some(e => e.name === `${pathNode} (${i})`)) i++;
        nextPointer = { name: `${pathNode} (${i})`, type: 'folder', id: getID(), files: [], uploadTime: Date.now() };
        filePointer.files?.push(nextPointer);
      }
      filePointer = nextPointer;
    });
    return filePointer.files ?? [];
  }
  private async addToTaskList(currentPath: string[], uploadFiles: File[]): Promise<void> {
    this.loading = true;
    try {
      const repository = await this.getActiveRepository();
      if (!repository) { this.loading = false; throw 'getRepositoryFailed'; }
      if (repository.useDatabase && !await database.check(repository)) throw `${this.$t('database.notSynchronize')}`;
      uploadFiles.forEach(file => {
        const path = [...currentPath];
        /*@ts-ignore*/
        const stringPath: string = file.webkitRelativePath;
        if (stringPath !== '') path.push(...stringPath.split('/').slice(0, -1));
        const task: Task = {
          id: Symbol(),
          name: file.name,
          file,
          relativePath: stringPath,
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
          cancelToken: axios.CancelToken.source(),
          repository: repository.id
        };
        this.taskList.push(task);
      });
    }
    catch (error) {
      if (typeof error === 'string') this.showAlert(error, 'error');
      else this.showAlert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loading = false;
  }
  private async upload(task: Task): Promise<void> {
    try {
      const repositories = await storage.getRepositories();
      const repository = repositories.find(e => e.id === task.repository);
      if (!repository) throw 'getRepositoryFailed';
      task.hashWorker = new hashWorker();
      task.timer = setInterval(() => {
        const now = Date.now() / 1000;
        task.speed = (task.progress.uploadedSize - task.lastUpdate.size) / (now - task.lastUpdate.time);
        task.lastUpdate.time = now;
        task.lastUpdate.size = task.progress.uploadedSize;
      }, 1000);
      const { digest, size } = await network.uploadFile(task.file as File, repository, this.onUploadProgress.bind(this, task), task.cancelToken, task.hashWorker as Worker);
      while (this.isCommitting) await new Promise(res => setTimeout(() => res(''), 1000));
      this.isCommitting = true;
      task.status = 'hashing';
      task.file = undefined;
      if (repository.useDatabase) {
        await database.add(
          task.path.slice(1),
          { name: task.name, digest, size, type: 'file', uploadTime: Date.now(), id: getID() },
          repository
        );
        if (this.taskList.every(e => e.status !== 'waiting')) {
          const config = await database.list(repository);
          await network.commit(config, repository);
          if (this.child?.getConfig) await this.child?.getConfig(true, true);
        }
      }
      else {
        const { config, layers } = await network.getManifests(repository);
        const files = config;
        const path = this.getPath(task.path, files);
        let conflictNameFile = path.find(e => e.name === task.name);
        if (conflictNameFile) {
          let i = 0;
          let [, name, ext] = task.name.match(/(.*)(\.[^.]*)$/) ?? [];
          if (!name) {
            name = task.name;
            ext = '';
          }
          while (conflictNameFile) {
            if (conflictNameFile?.digest === digest) throw 'fileExisted';
            i++;
            conflictNameFile = path.find(e => e.name === `${name} (${i})${ext}`);
          }
          task.name = `${name} (${i})${ext}`;
        }
        path.push({ name: task.name, digest, size, type: 'file', uploadTime: Date.now(), id: getID() });
        if (layers.every(e => e.digest !== digest))
          layers.push({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest, size });
        await network.commit(files, repository);
        if (this.child.getConfig) await this.child.getConfig(true, true);
      }
      task.status = 'complete';
    }
    catch (error) {
      if (error?.message === 'need login') this.loginAction(error.authenticateHeader, this.upload.bind(this, task));
      else if (error?.message !== 'manually cancel') {
        task.cancelToken.cancel();
        task.file = undefined;
        if (typeof error === 'string') task.status = `${this.$t('uploadError')}${this.$t(error)}`;
        else task.status = `${this.$t('uploadError')}${error}`;
      }
    }
    finally {
      clearInterval(task.timer as number);
      task.hashWorker?.terminate();
      this.isCommitting = false;
    }
  }
  private onUploadProgress(task: Task, e: ProgressEvent): void {
    const { loaded } = e;
    if (!task) return;
    task.progress.uploadedSize = loaded;
    task.remainingTime = (task.progress.totalSize - loaded) / task.speed;
    if (task.progress.totalSize - loaded !== 0 && task.status !== 'uploading') task.status = 'uploading';
  }
  private onAria2SettingChange(): void {
    if (!this.aria2AddressError) {
      storage.setValue('aria2', {
        address: this.address,
        secret: this.secret
      });
    }
  }
  private cancelTask(task: Task): void {
    if (task.status === 'uploading') {
      task.cancelToken.cancel('manually cancel');
    }
    task.status = 'cancel';
    task.file = undefined;
  }
  private clearCompleteTask(): void {
    this.taskList = this.taskList.filter(e => e.status !== 'complete');
    this.taskPage = 1;
  }
  private resetForm(value?: { type: string; username?: string; password?: string }): void {
    Object.assign(this.formValue, this.defaultFormValue, value);
    this.form?.resetValidation();
  }
  private showAlert(text: string, type = '', error?: Error): void {
    const freeAlert = this.alerts.find(alert => alert.show === false && alert.shown === true);
    const newAlert = { show: false, text, type, shown: false };
    if (freeAlert) {
      newAlert.show = true;
      newAlert.shown = true;
      Object.assign(freeAlert, newAlert);
    }
    else {
      this.alerts.push(newAlert);
      this.$nextTick(() => {
        newAlert.show = true;
        newAlert.shown = true;
      });
    }
    if (type === 'error' && error) {
      // eslint-disable-next-line
      console.error(
        `%c${this.$t('name')}%cv${this.$extensionVersion}%c ${error.stack ?? error}`,
        'border-radius: 4px 0 0 4px;color:#fff;background:#424242; padding: 0 4px',
        'color:white;background:#01579B;border-radius: 0 4px 4px 0;padding: 0 4px',
        ''
      );
    }
  }
}
</script>

<style scoped lang="scss">
#main-container {
  overflow-y: scroll;
  overflow-x: hidden;
}
.v-divider.slide-x-transition-move {
  transition: transform 0.6s;
}
.top-bar {
  border-width: 0 0 thin 0;
  border-style: solid;
}
.top-bar.theme--dark {
  border-bottom-color: hsla(0, 0%, 100%, 0.12) !important;
}
.top-bar.theme--light {
  border-bottom-color: rgba(0, 0, 0, 0.12) !important;
  background-color: white !important;
}
.top-bar.theme--dark::v-deep .v-badge .v-badge__badge::after {
  border-color: #272727;
}
.no-after::after {
  content: unset !important;
}
.list-ellipsis {
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
