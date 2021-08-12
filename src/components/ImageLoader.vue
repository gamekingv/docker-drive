<template>
  <v-row class="fill-height ma-0" align="center" justify="center">
    <v-fade-transition mode="out-in">
      <img
        v-if="loaded && !error && url && url !== 'error' && url !== 'loading'"
        :src="url"
        class="image"
      />
      <v-row
        v-else-if="url === 'loading' || (!error && url !== 'error')"
        class="view-height ma-0"
        align="center"
        justify="center"
      >
        <v-progress-circular
          color="primary"
          indeterminate
          size="64"
        ></v-progress-circular>
      </v-row>
      <v-row v-else class="view-height ma-0" align="center" justify="center">
        <v-btn fab depressed x-large @click.stop="retry()">
          <v-icon x-large>mdi-refresh</v-icon>
        </v-btn>
      </v-row>
    </v-fade-transition>
    <img
      v-show="false"
      :src="url !== 'loading' && url !== 'error' ? url : ''"
      @load="
        loaded = true;
        error = false;
      "
      @error="
        url !== 'loading' && url !== 'error' && url !== '' && (error = true)
      "
    />
  </v-row>
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from 'vue-property-decorator';

@Component

export default class ImageLoader extends Vue {
  @Prop({ type: String, default: '' }) private readonly url!: string

  @Emit()
  retry(): void { this.loaded = false; this.error = false; return; }

  private loaded = false
  private error = false
}
</script>

<style scoped lang="scss">
.image {
  max-width: 100%;
  max-height: 100%;
}
.view-height {
  height: calc(100vh + 1px);
}
</style>