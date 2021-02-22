<template>
  <v-dialog :value="showImage" fullscreen>
    <v-hover v-slot="{ hover }">
      <v-carousel
        v-model="index"
        hide-delimiters
        show-arrows-on-hover
        :continuous="false"
        height="100%"
        @change="onImageChange"
      >
        <v-carousel-item v-for="(image, i) in images" :key="i">
          <v-row class="fill-height ma-0 mask" align="center" justify="center">
            <v-img
              :src="imageURLs[i]"
              max-width="100%"
              max-height="100%"
              width="100%"
              height="100%"
              contain
            >
              <template v-slot:placeholder>
                <v-row class="fill-height ma-0" align="center" justify="center">
                  <v-progress-circular
                    color="primary"
                    indeterminate
                    size="64"
                  ></v-progress-circular>
                </v-row>
              </template>
            </v-img>
          </v-row>
        </v-carousel-item>
        <v-slide-y-transition>
          <v-toolbar
            v-if="hover"
            min-width="100vw"
            absolute
            color="transparent"
            flat
          >
            <v-toolbar-title>{{ showImage ? videoTitle : "" }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              fab
              depressed
              small
              color="rgba(0,0,0,0.3)"
              @click.stop="showImage = false"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-toolbar>
        </v-slide-y-transition>
      </v-carousel>
    </v-hover>
  </v-dialog>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Emit } from 'vue-property-decorator';
import { Repository } from '@/utils/types';
import network from '@/utils/network';

@Component

export default class ImageViewer extends Vue {

  @Prop(Object) private readonly activeRepository!: Repository
  @Prop() private readonly images!: { name: string; digest: string }[]
  @Prop(Number) private readonly imageIndex!: number
  @PropSync('show') private readonly showImage!: boolean

  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { ({ authenticateHeader, fn }); }
  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }

  private imageURLs: string[] = []
  private index = 0

  private created(): void {
    this.index = this.imageIndex;
    this.onImageChange(this.index);
  }
  private async onImageChange(i: number): Promise<void> {
    try {
      if (!this.imageURLs[i]) this.$set(this.imageURLs, i, await network.getDownloadURL(this.images[i].digest, this.activeRepository));
      if (!this.imageURLs[i + 1] && this.images[i + 1]) this.$set(this.imageURLs, i + 1, await network.getDownloadURL(this.images[i + 1].digest, this.activeRepository));
      if (!this.imageURLs[i - 1] && this.images[i - 1]) this.$set(this.imageURLs, i - 1, await network.getDownloadURL(this.images[i - 1].digest, this.activeRepository));
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.onImageChange.bind(i));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
  }
}
</script>

<style scope lang="scss">
.mask {
  background-color: rgb(33, 33, 33, 0.46);
  border-color: rgb(33, 33, 33, 0.46);
}
</style>