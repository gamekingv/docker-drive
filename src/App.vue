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
        <v-list-item key="repositories" to="/about" link>
          <v-list-item-icon>
            <v-icon>mdi-database-settings</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ $t("repositories") }}</v-list-item-title>
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
            @loading="loading = true"
            @loaded="loading = false"
            @login="loginAction"
            @alert="showAlert"
            @upload="addToTaskList"
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
      <div class="text-h5 text-center my-3">{{ $t("taskList") }}</div>
      <v-list>
        <template v-for="(task, index) in taskList">
          <v-list-item :key="task.id" class="my-2">
            <v-list-item-content>
              <v-list-item-title>{{ task.name }}</v-list-item-title>
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
                  <strong v-if="task.progress.totalSize !== 0"
                    >{{
                      (task.status === "uploading"
                        ? task.progress.uploadedSize
                        : undefined) | sizeFormat
                    }}{{ task.status === "uploading" ? "/" : ""
                    }}{{ task.progress.totalSize | sizeFormat }}</strong
                  >
                </div>
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-btn
                icon
                small
                @click="task.cancelToken.cancel('manually cancel')"
                ><v-icon small> mdi-close </v-icon></v-btn
              >
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

    <v-dialog v-model="action" persistent scrollable :max-width="400">
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
          <v-btn color="blue darken-1" @click.stop="form.validate() && login()">
            {{ $t("ok") }}
          </v-btn>
          <v-btn color="error" text @click.stop="closeForm()">
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-overlay :value="loading">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      ></v-progress-circular>
    </v-overlay>
    <v-snackbar v-model="alert" :color="alertColor" :timeout="5000" top right>
      {{ alertText }}
    </v-snackbar>
  </v-app>
</template>

<script lang="ts">
import { Vue, Component, Ref, Watch } from 'vue-property-decorator';
import axios, { CancelTokenSource } from 'axios';
import { Repository, VForm, FileItem } from '@/utils/types';
import network from '@/utils/network';
import Files from '@/views/Files.vue';

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
  path: string;
  lastUpdate: {
    time: number;
    size: number;
  };
  timer?: number | NodeJS.Timeout;
  cancelToken: CancelTokenSource;
}

@Component({
  filters: {
    sizeFormat(fileSize: number): string {
      if (fileSize !== 0 && !fileSize) return '';
      if (fileSize < 1024) {
        return `${fileSize.toFixed(0)}B`;
      } else if (fileSize < (1024 * 1024)) {
        return `${(fileSize / 1024).toFixed(0)}KB`;
      } else if (fileSize < (1024 * 1024 * 1024)) {
        return `${(fileSize / (1024 * 1024)).toFixed(1)}MB`;
      } else {
        return `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB`;
      }
    },
    progressPercentage({ uploadedSize, totalSize }: { uploadedSize: number; totalSize: number }): string {
      if (totalSize === 0) return '0%';
      return `${(uploadedSize / totalSize * 100).toFixed(1)}%`;
    }
  }
})

export default class APP extends Vue {
  @Ref() private readonly child!: Files
  @Ref() private readonly form!: VForm

  private loading = false
  private drawer = true
  private taskListPanel = false
  private taskList: Task[] = []
  private repositories: Repository[] = []
  private active = 0
  private action = false
  private beforeLogin!: { authenticateHeader: string | undefined; fn: Function | undefined; arg: string[] }
  private username = ''
  private password = ''
  private alert = false
  private alertText = ''
  private alertColor = ''

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

  private created(): void {
    this.repositories.push({
      name: 'kdjvideo',
      value: 1613370986951,
      url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/kdjvideo',
      token: '',
      secret: 'MTgwMjkyNjgzMjA6a2RqM0BhbGl5dW4='
    }, {
      name: 'test',
      value: 1613370986952,
      url: 'registry.cn-hangzhou.aliyuncs.com/kdjvideo/test',
      token: '',
      secret: 'MTgwMjkyNjgzMjA6a2RqM0BhbGl5dW4='
    }, {
      name: 'videorepo',
      value: 1613370986953,
      url: 'ccr.ccs.tencentyun.com/videorepo/videorepo',
      token: '',
      secret: 'MTAwMDA2NjU1MDMyOmtkajNAdGVuY2VudA=='
    });
    this.active = this.repositories[2].value;
  }
  private loginAction(authenticateHeader?: string, fn?: Function, arg: string[] = []): void {
    this.action = true;
    this.beforeLogin = { authenticateHeader, fn, arg };
  }
  private async login(): Promise<void> {
    const activeRepository = this.repositories.find(e => e.value === this.active);
    if (!activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    activeRepository.secret = btoa(`${this.username}:${this.password}`);
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
    if (this.beforeLogin.fn) this.beforeLogin.fn(...this.beforeLogin.arg);
  }
  private getPath(pathString: string, files: FileItem[]): FileItem[] {
    const path = pathString === '/' ? [] : pathString.substr(1).split('/');
    const cacheRoot = { name: 'root', type: 'folder', files, id: Symbol() };
    let filePointer: FileItem = cacheRoot;
    for (let i = 0; i < path.length; i++) {
      const nextPointer = filePointer.files?.find(e => e.name === path[i]);
      if (nextPointer?.type === 'folder') filePointer = nextPointer;
      else {
        return files;
      }
    }
    return filePointer.files ?? [];
  }
  private addToTaskList({ files, path }: { files: File[]; path: string }): void {
    files.forEach(file => {
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
        timer: setInterval(() => {
          const now = Date.now() / 1000;
          task.speed = (task.progress.uploadedSize - task.lastUpdate.size) / (now - task.lastUpdate.time);
          task.lastUpdate.time = now;
          task.lastUpdate.size = task.progress.uploadedSize;
        }, 1000),
        cancelToken: axios.CancelToken.source()
      };
      this.taskList.push(task);
    });

  }
  private async upload(task: Task): Promise<void> {
    const activeRepository = this.repositories.find(e => e.value === this.active);
    if (!activeRepository) return this.showAlert(`${this.$t('unknownError')}`, 'error');
    // this.loading = true;
    try {
      const { digest, size } = await network.uploadFile(task.file as File, activeRepository, this.onUploadProgress.bind(this, task.id), task.cancelToken);
      task.status = 'hashing';
      task.file = undefined;
      const { config, layers } = await network.getManifests(activeRepository);
      const files = network.parseConfig(config);
      this.getPath(task.path, files).push({ name: task.name, digest, size, type: 'file', uploadTime: Date.now(), id: Symbol() });
      layers.push({ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest, size });
      await network.commit({ files, layers }, activeRepository);
      if (this.child.getConfig) await this.child.getConfig();
      task.status = 'complete';
    }
    catch (error) {
      if (error.message === 'manually cancel') task.status = 'cancel';
      else if (error.message === 'need login') this.loginAction(error.authenticateHeader, this.upload);
      else {
        task.cancelToken.cancel();
        if (typeof error === 'string') task.status = `${this.$t('uploadError')}${this.$t(error)}`;
        else task.status = `${this.$t('unknownError')}${error.toString()}`;
      }
    }
    // this.loading = false;
  }
  private onUploadProgress(id: symbol, e: ProgressEvent): void {
    const { loaded } = e;
    const task = this.taskList.find(e => e.id === id);
    if (!task) return;
    task.progress.uploadedSize = loaded;
    task.remainingTime = (task.progress.totalSize - loaded) / task.speed;
    if (task.remainingTime === 0) {
      task.status = 'hashing';
      task.file = undefined;
      clearInterval(task.timer as number);
    }
  }
  private closeForm(): void {
    this.form.reset();
    this.form.resetValidation();
    this.action = false;
  }
  private showAlert(text: string, type = ''): void {
    this.alert = true;
    this.alertText = text;
    this.alertColor = type;
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