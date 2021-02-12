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
              <v-list-item-title class="mb-2">{{
                task.name
              }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-progress-linear
                  class="justify-space-between"
                  :value="task.progress"
                  height="25"
                >
                  <div
                    class="d-flex justify-space-between px-2"
                    style="width: 100%"
                  >
                    <strong>{{ `${task.speed}M/s` }}</strong>
                    <strong>{{ `${task.progress}%` }}</strong>
                    <strong>{{ `${task.remainingTime}分钟` }}</strong>
                  </div>
                </v-progress-linear>
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-list-item-action-text>{{
                `${task.remainingTime}分钟`
              }}</v-list-item-action-text>
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
  progress: number;
  speed: number;
  remainingTime: number;
  uploadStartTime: number;
  uploadEndTime: number;
}

@Component

export default class APP extends Vue {
  private drawer = true
  private taskListPanel = false
  private taskList: Task[] = []

  created(): void {
    this.taskList.push({
      id: Symbol(),
      name: 'test1',
      file: undefined,
      status: '开始校验',
      progress: 55,
      speed: 3,
      remainingTime: 3,
      uploadStartTime: 0,
      uploadEndTime: 0
    }, {
      id: Symbol(),
      name: 'test2',
      file: undefined,
      status: '开始校验',
      progress: 55,
      speed: 3,
      remainingTime: 3,
      uploadStartTime: 0,
      uploadEndTime: 0
    });
  }
}
</script>