<template>
  <v-row class="fill-height ma-0 mask" align="center" justify="center">
    <img
      v-show="loaded"
      :src="url"
      class="image"
      @load="loaded = true"
      @error="loaded = true"
    />
    <v-progress-circular
      v-show="!loaded"
      color="primary"
      indeterminate
      size="64"
    ></v-progress-circular>
  </v-row>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component

export default class ImageLoader extends Vue {

  @Prop({ type: String, default: 'error' }) private readonly url!: string

  private loaded = false
}
</script>

<style scope lang="scss">
.image {
  max-width: 100%;
  max-height: 100%;
}
.mask {
  background-color: rgb(33, 33, 33, 0.46);
  border-color: rgb(33, 33, 33, 0.46);
}
</style>