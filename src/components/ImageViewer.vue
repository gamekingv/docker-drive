<template>
  <v-dialog
    v-model="showImage"
    fullscreen
    content-class="image-viewer-mask"
    transition="fade-transition"
  >
    <v-fade-transition mode="out-in">
      <v-hover v-if="showViewer" v-slot="{ hover }">
        <v-fade-transition mode="out-in">
          <v-carousel
            v-if="!multiple"
            v-model="index"
            hide-delimiters
            show-arrows-on-hover
            :continuous="false"
            height="100%"
            @change="onImageChange"
          >
            <v-carousel-item v-for="(image, i) in images" :key="i">
              <image-loader :url="imageURLs[i]" @retry="reload(i)" />
            </v-carousel-item>
            <v-slide-y-transition>
              <v-toolbar
                v-if="hover"
                min-width="100vw"
                absolute
                color="transparent"
                flat
              >
                <v-btn
                  fab
                  depressed
                  small
                  color="rgba(0,0,0,0.3)"
                  @click.stop="multiple = !multiple"
                >
                  <v-icon>mdi-image-multiple</v-icon>
                </v-btn>
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
            <v-slide-y-transition>
              <v-toolbar
                v-if="hover"
                class="multiple-image-mode-toolbar"
                min-width="100vw"
                color="transparent"
                flat
              >
                <v-btn
                  fab
                  depressed
                  small
                  color="rgba(0,0,0,0.3)"
                  style="pointer-events: auto"
                  @click.stop="multiple = !multiple"
                >
                  <v-icon>mdi-image</v-icon>
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                  fab
                  depressed
                  small
                  color="rgba(0,0,0,0.3)"
                  style="pointer-events: auto"
                  @click.stop="showImage = false"
                >
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-toolbar>
            </v-slide-y-transition>
          </v-col>
        </v-fade-transition>
      </v-hover>
      <v-row v-else class="fill-height ma-0" align="center" justify="center">
        <v-progress-circular
          color="primary"
          indeterminate
          size="64"
        ></v-progress-circular>
      </v-row>
    </v-fade-transition>
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

  @Prop(Object) private readonly activeRepository!: Repository
  @Prop() private readonly displayList!: FileItem[]
  @Prop() private readonly listSortBy!: string | string[] | undefined
  @Prop() private readonly listSortDesc!: boolean | boolean[] | undefined
  @Prop() private readonly searchText!: string | undefined
  @Prop(String) private readonly name!: string
  @PropSync('show') private readonly showImage!: boolean

  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { ({ authenticateHeader, fn }); }
  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }

  @Watch('showImage')
  private async onShow(val: boolean): Promise<void> {
    if (val) {
      const worker = new sortWorker();
      const promiseWorker = new PromiseWorker(worker);
      const { images, index }: { images: { name: string; digest: string }[]; index: number } = await promiseWorker.postMessage({
        displayListString: JSON.stringify(this.displayList),
        listSortBy: this.listSortBy,
        listSortDesc: this.listSortDesc,
        searchText: this.searchText,
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
    else this.showViewer = false;
  }
  @Watch('multiple')
  private onModeChange(val: boolean): void {
    if (val) {
      this.multipleInitialized = false;
      this.imageURLs.fill(undefined, 0, this.index);
      this.imageURLs.fill(undefined, this.index + 1);
    }
  }

  private imageURLs: (string | undefined)[] = []
  private index = 0
  private showViewer = false
  private multiple = false
  private multipleInitialized = false
  private images: { name: string; digest: string }[] = []

  private async onImageChange(i: number): Promise<void> {
    try {
      if (!this.imageURLs[i]) {
        this.$set(this.imageURLs, i, 'loading');
        this.$set(this.imageURLs, i, await network.getDownloadURL(this.images[i].digest, this.activeRepository));
      }
      if (!this.imageURLs[i + 1] && this.images[i + 1] && !this.multiple) {
        this.$set(this.imageURLs, i + 1, 'loading');
        this.$set(this.imageURLs, i + 1, await network.getDownloadURL(this.images[i + 1].digest, this.activeRepository));
      }
      if (!this.imageURLs[i - 1] && this.images[i - 1] && !this.multiple) {
        this.$set(this.imageURLs, i - 1, 'loading');
        this.$set(this.imageURLs, i - 1, await network.getDownloadURL(this.images[i - 1].digest, this.activeRepository));
      }
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.onImageChange.bind(this, i));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      if (!this.imageURLs[i] || this.imageURLs[i] === 'loading') this.$set(this.imageURLs, i, 'error');
      if ((!this.imageURLs[i + 1] || this.imageURLs[i + 1] === 'loading') && !this.multiple) this.$set(this.imageURLs, i + 1, 'error');
      if ((!this.imageURLs[i - 1] || this.imageURLs[i - 1] === 'loading') && !this.multiple) this.$set(this.imageURLs, i - 1, 'error');
    }
  }
  private async onIntersect(i: number, [entry]: IntersectionObserverEntry[]): Promise<void> {
    if (entry?.isIntersecting === false) return;
    try {
      if (!this.imageURLs[i + 1] && this.images[i + 1]) {
        this.$set(this.imageURLs, i + 1, 'loading');
        this.$set(this.imageURLs, i + 1, await network.getDownloadURL(this.images[i + 1].digest, this.activeRepository));
      }
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.onIntersect.bind(this, i, [entry]));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      this.$set(this.imageURLs, i + 1, 'error');
    }
    this.index = i;
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
        if (error.message === 'need login') this.login(error.authenticateHeader, this.onScrollToTop.bind(this, [entry]));
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
        this.$set(this.imageURLs, i - 1, 'error');
      }
    }
  }
  private async reload(i: number): Promise<void> {
    try {
      this.$set(this.imageURLs, i, await network.getDownloadURL(this.images[i].digest, this.activeRepository));
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.reload.bind(this, i));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
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
</style>

<style lang="scss">
.image-viewer-mask {
  background-color: rgb(33, 33, 33, 0.46);
  border-color: rgb(33, 33, 33, 0.46);
}
</style>