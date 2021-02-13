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

    <v-app-bar absolute elevate-on-scroll scroll-target="#main-container" app>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>{{ $t("name") }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click.stop="taskListPanel = !taskListPanel"
        ><v-icon>mdi-calendar-check-outline</v-icon></v-btn
      >
    </v-app-bar>

    <v-navigation-drawer
      v-model="taskListPanel"
      right
      temporary
      absolute
      :width="500"
      style="max-width: 90vw"
    >
      <div class="text-h5 text-center my-4">{{ $t("taskList") }}</div>
      <v-list>
        <template v-for="(task, index) in taskList">
          <v-list-item :key="task.id" class="mb-2">
            <v-list-item-content>
              <v-list-item-title>{{ task.name }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-progress-linear
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
              <v-btn icon small><v-icon small> mdi-close </v-icon></v-btn>
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

    <v-main id="main" class="grey darken-3">
      <v-container
        id="main-container"
        class="py-8 px-6 overflow-y-auto overflow-x-hidden"
        fluid
      >
        <v-fade-transition duration="80" mode="out-in">
          <router-view />
        </v-fade-transition>
      </v-container>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

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
}

@Component({
  filters: {
    sizeFormat(fileSize: number): string {
      if (fileSize !== 0 && !fileSize) return '';
      if (fileSize < 1024) {
        return `${fileSize}B`;
      } else if (fileSize < (1024 * 1024)) {
        return `${(fileSize / 1024).toFixed(0)}KB`;
      } else if (fileSize < (1024 * 1024 * 1024)) {
        return `${(fileSize / (1024 * 1024)).toFixed(0)}MB`;
      } else {
        return `${(fileSize / (1024 * 1024 * 1024)).toFixed(0)}GB`;
      }
    },
    progressPercentage({ uploadedSize, totalSize }: { uploadedSize: number; totalSize: number }): string {
      if (totalSize === 0) return '0%';
      return `${(uploadedSize / totalSize * 100).toFixed(1)}%`;
    }
  }
})

export default class APP extends Vue {
  private drawer = true
  private taskListPanel = false
  private taskList: Task[] = []

  created(): void {
    this.taskList.push({
      id: Symbol(),
      name: 'test1',
      file: undefined,
      status: 'uploading',
      progress: {
        uploadedSize: 452542450,
        totalSize: 1220101010,
      },
      speed: 3101000,
      remainingTime: 131231233,
      path: '/',
      lastUpdate: {
        time: 0,
        size: 0
      }
    }, {
      id: Symbol(),
      name: 'test2',
      file: undefined,
      status: 'uploading',
      progress: {
        uploadedSize: 0,
        totalSize: 4,
      },
      speed: 1555,
      remainingTime: 3500,
      path: '/',
      lastUpdate: {
        time: 0,
        size: 0
      }
    }, {
      id: Symbol(),
      name: 'test2',
      file: undefined,
      status: 'hashing',
      progress: {
        uploadedSize: 2,
        totalSize: 3,
      },
      speed: 1,
      remainingTime: 59,
      path: '/',
      lastUpdate: {
        time: 0,
        size: 0
      }
    });
  }
  private remainingFormat(remainingTime: number): string {
    if (!remainingTime) return '';
    let timeString = '';
    if (remainingTime < 60) timeString = ` ${remainingTime}${this.$t('second')}`;
    else if (remainingTime < 60 * 60) timeString = ` ${(remainingTime / 60).toFixed(0)}${this.$t('minute')}`;
    else timeString = `${this.$t('over1h')}`;
    return ` ( ${this.$t('remaining', [timeString])} ) `;
  }
}
</script>