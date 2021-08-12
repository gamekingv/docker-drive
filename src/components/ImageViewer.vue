<template>
  <v-dialog
    v-model="showImage"
    fullscreen
    content-class="image-viewer-mask"
    transition="fade-transition"
  >
    <v-toolbar
      class="image-viewer-top-bar"
      color="rgba(0,0,0,0.3)"
      min-width="100vw"
      dark
      flat
    >
      <v-tooltip bottom :open-delay="300">
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
            @click.stop="
              if (!multiple) {
                multipleInitialized = false;
                imageURLs = Object.assign([], { [index]: imageURLs[index] });
              }
              multiple = !multiple;
            "
          >
            <v-icon>mdi-image-multiple</v-icon>
          </v-btn>
        </template>
        <span>{{ $t("switchMode") }}</span>
      </v-tooltip>
      <v-toolbar-title v-if="images[index]" class="pl-5">{{
        images[index].name
      }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn class="ml-5" icon @click.stop="showImage = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-toolbar>
    <v-fade-transition mode="out-in">
      <div v-if="showViewer" key="viewer" class="fill-height">
        <v-fade-transition mode="out-in">
          <v-carousel
            v-if="!multiple"
            v-model="index"
            hide-delimiters
            :continuous="false"
            height="100%"
            @change="onImageChange"
          >
            <v-carousel-item v-for="(image, i) in images" :key="i">
              <image-loader :url="imageURLs[i]" @retry="reload(i)" />
            </v-carousel-item>
            <template v-slot:prev="{ on, attrs }">
              <div
                class="carousel-button carousel-button-prev"
                v-bind="attrs"
                v-on="on"
              ></div>
            </template>
            <template v-slot:next="{ on, attrs }">
              <div
                class="carousel-button carousel-button-next"
                v-bind="attrs"
                v-on="on"
              ></div>
            </template>
            <img v-show="false" :src="preloadURL" />
          </v-carousel>
          <v-col v-else class="pa-0 overflow-x-hidden">
            <v-toolbar
              v-if="!imageURLs[0]"
              ref="prevSpacer"
              v-intersect="{
                handler: onScrollToTop,
                options: {
                  threshold: [0, 1],
                },
              }"
              color="transparent"
              flat
            ></v-toolbar>
            <template v-for="(image, i) in images">
              <image-loader
                v-if="imageURLs[i]"
                :key="i"
                v-intersect="onIntersect.bind(this, i)"
                :url="imageURLs[i]"
                @retry="reload(i)"
              />
            </template>
          </v-col>
        </v-fade-transition>
      </div>
      <v-row
        v-else
        key="loader"
        class="fill-height ma-0"
        align="center"
        justify="center"
      >
        <v-progress-circular
          color="primary"
          indeterminate
          size="64"
        ></v-progress-circular>
      </v-row>
    </v-fade-transition>
    <v-chip class="rounded-r-0 rounded-bl-0 image-count" x-small label
      >{{ index + 1 }}/{{ images.length }}</v-chip
    >
  </v-dialog>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Emit, Watch, Ref } from 'vue-property-decorator';
import ImageLoader from '@/components/ImageLoader.vue';
import { Repository, FileItem } from '@/utils/types';
import PromiseWorker from 'promise-worker';
import sortWorker from '@/utils/sort.worker';
import network from '@/utils/network';

@Component({
  components: {
    ImageLoader
  }
})

export default class ImageViewer extends Vue {
  @Ref() private readonly prevSpacer!: Vue

  @Prop() private readonly activeRepository!: Repository
  @Prop() private readonly displayList!: FileItem[]
  @Prop() private readonly listSortBy!: string | string[] | undefined
  @Prop() private readonly listSortDesc!: boolean | boolean[] | undefined
  @Prop(String) private readonly name!: string
  @PropSync('show') private readonly showImage!: boolean

  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { ({ authenticateHeader, fn }); }
  @Emit()
  private alert(text: string, type?: string, error?: Error): void { ({ text, type, error }); }

  @Watch('showImage')
  private async onShow(val: boolean): Promise<void> {
    if (val) {
      const worker = new sortWorker();
      const promiseWorker = new PromiseWorker(worker);
      const { images, index }: { images: { name: string; digest: string }[]; index: number } = await promiseWorker.postMessage({
        displayListString: JSON.stringify(this.displayList),
        listSortBy: this.listSortBy,
        listSortDesc: this.listSortDesc,
        itemName: this.name
      });
      worker.terminate();
      this.images = images;
      this.index = index;
      this.imageURLs = [];
      this.onImageChange(this.index);
      if (this.multiple) this.multipleInitialized = false;
      this.$nextTick(() => this.showViewer = true);
    }
    else this.$nextTick(() => this.showViewer = false);
  }

  private imageURLs: (string | undefined)[] = []
  private index = 0
  private showViewer = false
  private multiple = false
  private multipleInitialized = false
  private images: { name: string; digest: string }[] = []
  private preloadURL = ''

  private async onImageChange(i: number): Promise<void> {
    try {
      if (!this.imageURLs[i]) {
        this.$set(this.imageURLs, i, 'loading');
        this.$set(this.imageURLs, i, await network.getDownloadURL(this.images[i].digest, this.activeRepository));
      }
      if (!this.imageURLs[i + 1] && this.images[i + 1] && !this.multiple) {
        this.$set(this.imageURLs, i + 1, 'loading');
        this.preloadURL = await network.getDownloadURL(this.images[i + 1].digest, this.activeRepository);
        this.$set(this.imageURLs, i + 1, this.preloadURL);
      }
      if (!this.imageURLs[i - 1] && this.images[i - 1] && !this.multiple) {
        this.$set(this.imageURLs, i - 1, 'loading');
        this.$set(this.imageURLs, i - 1, await network.getDownloadURL(this.images[i - 1].digest, this.activeRepository));
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.onImageChange.bind(this, i));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
      if (!this.imageURLs[i] || this.imageURLs[i] === 'loading') this.$set(this.imageURLs, i, 'error');
      if ((!this.imageURLs[i + 1] || this.imageURLs[i + 1] === 'loading') && !this.multiple) this.$set(this.imageURLs, i + 1, 'error');
      if ((!this.imageURLs[i - 1] || this.imageURLs[i - 1] === 'loading') && !this.multiple) this.$set(this.imageURLs, i - 1, 'error');
    }
  }
  private onIntersect(i: number, [entry]: IntersectionObserverEntry[]): void {
    if (entry?.isIntersecting === false) return;
    try {
      this.index = i;
      if (!this.imageURLs[i + 1] && this.images[i + 1]) {
        this.$nextTick(async () => {
          this.$set(this.imageURLs, i + 1, 'loading');
          this.$set(this.imageURLs, i + 1, await network.getDownloadURL(this.images[i + 1].digest, this.activeRepository));
        });
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.onIntersect.bind(this, i, [entry]));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
      this.$set(this.imageURLs, i + 1, 'error');
    }
  }
  private async onScrollToTop([entry]: IntersectionObserverEntry[]): Promise<void> {
    if (!this.multipleInitialized) {
      this.multipleInitialized = true;
      this.prevSpacer?.$el.nextElementSibling?.scrollIntoView();
    }
    else if (entry?.intersectionRatio === 1) {
      const i = this.imageURLs.findIndex(e => e);
      try {
        if (!this.imageURLs[i - 1] && this.images[i - 1]) {
          this.$set(this.imageURLs, i - 1, 'loading');
          this.$nextTick(() => this.prevSpacer?.$el.nextElementSibling?.scrollIntoView());
          this.$set(this.imageURLs, i - 1, await network.getDownloadURL(this.images[i - 1].digest, this.activeRepository));
        }
      }
      catch (error) {
        if (error?.message === 'need login') this.login(error.authenticateHeader, this.onScrollToTop.bind(this, [entry]));
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}`, 'error', error);
        this.$set(this.imageURLs, i - 1, 'error');
      }
    }
  }
  private async reload(i: number): Promise<void> {
    try {
      this.$set(this.imageURLs, i, await network.getDownloadURL(this.images[i].digest, this.activeRepository));
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.reload.bind(this, i));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
      this.$set(this.imageURLs, i, 'error');
    }
  }
}
</script>

<style scoped lang="scss">
.multiple-image-mode-toolbar {
  position: fixed;
  top: 0;
  pointer-events: none;
}
.image-viewer-top-bar {
  position: fixed;
  top: 0;
  opacity: 0;
  z-index: 2;
  transition: opacity 0.3s;
}
.image-viewer-top-bar:hover {
  opacity: 1;
}
.image-count {
  width: auto;
  position: fixed;
  right: 0;
  bottom: 0;
}
.carousel-button {
  position: fixed;
  height: 100vh;
  width: 40vw;
  top: 0;
}
.carousel-button.carousel-button-next {
  right: 0;
  cursor: url("../assets/arrow-right.svg") 16 16, pointer;
}
.carousel-button.carousel-button-prev {
  left: 0;
  cursor: url("../assets/arrow-left.svg") 16 16, pointer;
}
</style>

<style lang="scss">
.image-viewer-mask {
  background-color: rgb(33, 33, 33, 0.46);
  border-color: rgb(33, 33, 33, 0.46);
}
</style>