<template>
  <v-dialog v-model="showImage" fullscreen>
    <v-hover v-slot="{ hover }">
      <v-carousel
        v-if="showViewer"
        v-model="index"
        hide-delimiters
        show-arrows-on-hover
        :continuous="false"
        height="100%"
        @change="onImageChange"
      >
        <v-carousel-item v-for="(image, i) in images" :key="i">
          <image-loader :url="imageURLs[i]" />
        </v-carousel-item>
        <v-slide-y-transition>
          <v-toolbar
            v-if="hover"
            min-width="100vw"
            absolute
            color="transparent"
            flat
          >
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
import { Vue, Component, Prop, PropSync, Emit, Watch } from 'vue-property-decorator';
import ImageLoader from '@/components/ImageLoader.vue';
import { Repository } from '@/utils/types';
import network from '@/utils/network';

@Component({
  components: {
    ImageLoader
  }
})

export default class ImageViewer extends Vue {

  @Prop(Object) private readonly activeRepository!: Repository
  @Prop(Array) private readonly images!: { name: string; digest: string }[]
  @Prop(Number) private readonly imageIndex!: number
  @PropSync('show') private readonly showImage!: boolean

  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { ({ authenticateHeader, fn }); }
  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }

  @Watch('showImage')
  private onShow(val: boolean): void {
    if (val) {
      this.index = this.imageIndex;
      this.imageURLs = [];
      this.onImageChange(this.index);
      this.$nextTick(() => this.showViewer = true);
    }
    else this.showViewer = false;
  }

  private imageURLs: string[] = []
  private index = 0
  private showViewer = false

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