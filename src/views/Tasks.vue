<template>
  <div class="fill-height">
    <v-tabs v-model="taskTab" background-color="transparent">
      <v-tab v-for="type in ['uploading', 'complete', 'failed']" :key="type">
        {{ $t(`task.${type}`) }}
      </v-tab>
    </v-tabs>
    <v-tabs-items v-model="taskTab" class="transparent mt-2">
      <v-tab-item
        v-for="type in ['uploading', 'complete', 'failed']"
        :key="type"
      >
        <v-data-iterator
          :items="tasks[type]"
          :items-per-page="$vuetify.breakpoint.mdAndUp ? 15 : 10"
          hide-default-footer
          :page.sync="taskPage[type]"
          @page-count="taskPageLength[type] = $event"
        >
          <template v-slot:default="{ items: tasks }">
            <v-row dense>
              <v-col
                v-for="task in tasks"
                :key="task.id"
                cols="12"
                md="4"
                sm="6"
              >
                <v-sheet
                  class="overflow-hidden"
                  :title="task.relativePath || task.name"
                  rounded
                  outlined
                  style="position: relative"
                >
                  <v-sheet
                    :color="
                      task.status === 'waiting' || task.status === 'cancel'
                        ? 'grey'
                        : task.status === 'uploading' ||
                          task.status === 'hashing'
                        ? 'primary'
                        : task.status === 'complete'
                        ? 'success'
                        : 'error'
                    "
                    :width="task.progress | progressPercentage"
                    height="100%"
                    style="opacity: 0.15; position: absolute"
                  ></v-sheet>
                  <v-list-item v-blur link>
                    <v-list-item-avatar>
                      <v-icon :color="task.name | iconColor">{{
                        task.name | iconFormat
                      }}</v-icon>
                    </v-list-item-avatar>
                    <v-list-item-content>
                      <v-list-item-title>{{
                        task.relativePath || task.name
                      }}</v-list-item-title>
                      <v-list-item-subtitle v-if="task.status === 'uploading'"
                        >{{ task.speed | sizeFormat }}/s ({{
                          task.progress.uploadedSize | sizeFormat
                        }}/{{ task.progress.totalSize | sizeFormat }}) -
                        {{
                          remainingFormat(task.remainingTime)
                        }}</v-list-item-subtitle
                      >
                      <v-list-item-subtitle
                        v-else-if="task.status === 'complete'"
                        >{{
                          task.progress.totalSize | sizeFormat
                        }}</v-list-item-subtitle
                      >
                      <v-list-item-subtitle
                        v-else-if="
                          ['cancel', 'hashing', 'waiting'].includes(task.status)
                        "
                        >{{ $t(`task.${task.status}`) }}</v-list-item-subtitle
                      >
                      <v-list-item-subtitle v-else>{{
                        task.status
                      }}</v-list-item-subtitle>
                    </v-list-item-content>
                    <v-list-item-action
                      v-if="
                        task.status === 'uploading' ||
                        task.status === 'waiting' ||
                        task.status === 'hashing'
                      "
                    >
                      <v-tooltip top :open-delay="300">
                        <template v-slot:activator="{ on, attrs }">
                          <v-btn
                            small
                            icon
                            color="red"
                            :disable="task.status === 'hashing'"
                            v-bind="attrs"
                            v-on="on"
                            @click.stop="cancel(task)"
                          >
                            <v-icon small>mdi-close</v-icon>
                          </v-btn>
                        </template>
                        <span
                          v-if="
                            task.status === 'uploading' ||
                            task.status === 'waiting'
                          "
                          >{{ $t("cancel") }}</span
                        >
                      </v-tooltip>
                    </v-list-item-action>
                    <v-list-item-action v-else>
                      <v-icon v-if="task.status === 'cancel'" color="grey"
                        >mdi-cancel</v-icon
                      >
                      <v-icon
                        v-else-if="task.status === 'complete'"
                        color="success"
                        >mdi-check-circle-outline</v-icon
                      >
                      <v-icon v-else color="error"
                        >mdi-close-circle-outline</v-icon
                      >
                    </v-list-item-action>
                  </v-list-item>
                </v-sheet>
              </v-col>
            </v-row>
          </template>
          <template v-slot:no-data>
            <v-row justify="center" align="center" style="height: 200px">
              <v-col class="text-center grey--text text-subtitle-1">{{
                $t("task.noTask", [$t(`task.${type}`)])
              }}</v-col>
            </v-row>
          </template>
        </v-data-iterator>
        <v-pagination
          v-if="taskPageLength[type] > 1"
          v-model="taskPage[type]"
          :length="taskPageLength[type]"
          :total-visible="7"
        ></v-pagination>
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit, Watch } from 'vue-property-decorator';
import { Task } from '@/utils/types';
import { sizeFormat, progressPercentage, iconFormat, iconColor } from '@/utils/filters';
import { Dictionary } from 'vue-router/types/router';

@Component({
  filters: {
    sizeFormat,
    progressPercentage,
    iconFormat,
    iconColor
  }
})

export default class Tasks extends Vue {
  @Emit()
  private cancel(task: Task): void { task; }

  @Prop(Array) private readonly taskList!: Task[]

  private taskTab = 'uploading'
  private taskPage = {
    uploading: 1,
    complete: 1,
    failed: 1
  }
  private taskPageLength = {
    uploading: 1,
    complete: 1,
    failed: 1
  }
  private get tasks(): Dictionary<Task[]> {
    const list: Dictionary<Task[]> = {
      uploading: [],
      complete: [],
      failed: []
    };
    this.taskList.forEach(task => {
      if (['uploading', 'hashing', 'waiting'].includes(task.status)) list.uploading.push(task);
      else if (task.status === 'complete') list.complete.push(task);
      else list.failed.push(task);
    });
    return list;
  }

  @Watch('taskPage')
  private onTaskPageChange(): void {
    this.$vuetify.goTo(0, {
      container: '#main-container',
      duration: 0,
    });
  }

  private remainingFormat(remainingTime: number): string {
    if (!remainingTime) return '';
    let timeString = '';
    if (remainingTime < 60) timeString = ` ${remainingTime.toFixed(0)}${this.$t('second')}`;
    else if (remainingTime < 60 * 60) timeString = ` ${(remainingTime / 60).toFixed(0)}${this.$t('minute')}`;
    else timeString = `${this.$t('task.over1h')}`;
    return `${this.$t('task.remaining', [timeString])}`;
  }
}
</script>