<template>
  <v-list-item
    :key="file.name"
    ref="item"
    :style="width === 0 ? '' : `width: ${width}px`"
  >
    <v-list-item-avatar>
      <v-icon :color="file.name | iconColor">{{
        file.name | iconFormat
      }}</v-icon>
    </v-list-item-avatar>
    <v-list-item-content>
      <v-list-item-title>{{ file.name }}</v-list-item-title>
      <v-list-item-subtitle class="text--primary">{{
        file.size | sizeFormat
      }}</v-list-item-subtitle>
      <v-list-item-subtitle>{{
        `${path}/${
          file.webkitRelativePath ? file.webkitRelativePath : file.name
        }`
      }}</v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action>
      <v-btn icon small @click.stop="beforeDelete()">
        <v-icon small>mdi-close</v-icon>
      </v-btn>
    </v-list-item-action>
  </v-list-item>
</template>

<script lang="ts">
import { Vue, Component, Prop, Ref, Emit } from 'vue-property-decorator';
import { sizeFormat, iconFormat, iconColor } from '@/utils/filters';

@Component({
  filters: {
    sizeFormat,
    iconFormat,
    iconColor
  }
})

export default class UploadFileListItem extends Vue {
  @Ref() private readonly item!: Vue

  @Emit()
  deleteItem(): void { return; }

  @Prop(File) private readonly file!: File
  @Prop() private readonly path!: string

  private loaded = false
  private width = 0

  private beforeDelete(): void {
    this.width = (this.item.$el as HTMLElement).offsetWidth;
    this.$nextTick(() => this.deleteItem());
  }
}
</script>