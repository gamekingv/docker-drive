<template>
  <v-data-table
    class="grey darken-3"
    :headers="fileListHeader"
    :items="fileList"
    :items-per-page="10"
    show-select
  >
    <template v-slot:[`item.size`]="{ item }">
      {{ formatFileSize(item.size) }}
    </template>
    <template v-slot:[`item.uploadTime`]="{ item }">
      {{ formatTime(item.uploadTime) }}
    </template>
  </v-data-table>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component

export default class FileList extends Vue {
  private fileListHeader = [
    { text: this.$t('filename'), align: 'start', value: 'name' },
    { text: this.$t('fileSize'), value: 'size', sortable: false },
    { text: this.$t('fileUploadTime'), value: 'uploadTime' }
  ]
}
</script>