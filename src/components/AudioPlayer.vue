<template>
  <div>
    <v-bottom-sheet v-model="showPlayer">
      <template v-slot:activator="{ on, attrs }">
        <v-fab-transition>
          <v-btn
            v-show="showAudio"
            v-blur
            color="purple lighten-1"
            fab
            dark
            fixed
            bottom
            right
            v-bind="attrs"
            v-on="on"
          >
            <v-progress-circular
              :rotate="-90"
              :size="56"
              :width="3"
              :value="(currentTime / duration) * 100"
              :indeterminate="loading"
              color="purple lighten-3"
            >
              <v-icon color="white">mdi-music</v-icon>
            </v-progress-circular>
          </v-btn>
        </v-fab-transition>
      </template>
      <v-card tile>
        <v-slider
          v-model="currentTime"
          color="purple"
          :track-color="`grey ${dark ? 'darken-2' : 'lighten-1'}`"
          :max="Math.floor(duration) || 1"
          :min="0"
          hide-details
          loading
          @start="seeking = true"
          @end="
            audio.currentTime = $event;
            seeking = false;
          "
        >
          <template v-slot:progress>
            <v-progress-linear
              class="progress-bar"
              color="purple"
              :value="loadedPercentage * 100"
              :height="2"
              absolute
              top
              :background-opacity="0"
              :indeterminate="loading"
            ></v-progress-linear>
          </template>
          <template v-slot:append>
            <v-row
              class="text-caption mr-2 my-0 ml-n2"
              align="center"
              style="height: 24px; white-space: nowrap"
              >{{ currentTime | durationFormat }}/{{
                duration | durationFormat
              }}</v-row
            >
          </template>
        </v-slider>
        <v-list class="py-0" :dense="!smAndUp">
          <v-list-item v-if="!smAndUp">
            <v-list-item-content>
              <v-list-item-title>{{ playingAudio.name }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content v-if="smAndUp">
              <v-list-item-title>{{ playingAudio.name }}</v-list-item-title>
            </v-list-item-content>
            <v-list-item-action class="my-0 mr-0" :class="{ 'ml-3': smAndUp }">
              <v-slider
                v-model="volume"
                class="volume-slider"
                color="purple"
                :track-color="`grey ${dark ? 'darken-2' : 'lighten-1'}`"
                :max="100"
                :min="0"
                :height="smAndUp ? '' : 28"
                :style="`width: ${smAndUp ? 150 : 100}px`"
                hide-details
                dense
                @input="audio.volume = $event / 100"
              >
                <template v-slot:prepend>
                  <v-btn
                    class="my-n1 mr-n2"
                    style="z-index: 1"
                    icon
                    :small="!smAndUp"
                    @click.stop="
                      muted = !muted;
                      audio.muted = muted;
                    "
                  >
                    <v-icon :small="!smAndUp">{{
                      `mdi-volume-${muted ? "off" : "high"}`
                    }}</v-icon>
                  </v-btn>
                </template>
              </v-slider>
            </v-list-item-action>
            <v-spacer v-if="!smAndUp"></v-spacer>
            <v-list-item-action class="my-0 mr-0" :class="{ 'ml-3': smAndUp }">
              <v-menu
                content-class="normal-z-index"
                offset-y
                top
                max-width="70vw"
                @input="$event && (listPage = Math.ceil((audioIndex + 1) / 20))"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-btn :small="!smAndUp" icon v-bind="attrs" v-on="on">
                    <v-icon :small="!smAndUp">mdi-playlist-music</v-icon>
                  </v-btn>
                </template>
                <v-card
                  class="d-flex flex-column justify-space-between"
                  flat
                  tile
                  height="70vh"
                  :width="300"
                >
                  <v-data-iterator
                    :items="list"
                    :page.sync="listPage"
                    :items-per-page="20"
                    hide-default-footer
                  >
                    <template v-slot:default="{ items }">
                      <v-list dense>
                        <v-list-item
                          v-for="item in items"
                          :key="item.id"
                          :input-value="item.id === audioIndex"
                          @click="audioIndex = item.id"
                        >
                          <v-list-item-title
                            ><v-icon
                              v-if="item.id === audioIndex"
                              class="mr-2"
                              small
                              >mdi-music</v-icon
                            >{{ item.name }}</v-list-item-title
                          >
                        </v-list-item>
                      </v-list>
                    </template>
                    <!-- <template v-slot:footer>
                      <v-row
                        class="ma-0 pb-2"
                        align="center"
                        justify="space-around"
                        @click.stop=""
                      >
                      </v-row>
                    </template> -->
                  </v-data-iterator>
                  <v-card flat tile>
                    <v-row
                      class="ma-0 pb-2"
                      align="center"
                      justify="space-around"
                      @click.stop
                    >
                      <v-btn
                        :disabled="listPage === 1"
                        small
                        icon
                        @click.stop="listPage = 1"
                      >
                        <v-icon>mdi-chevron-double-left</v-icon>
                      </v-btn>
                      <v-btn
                        :disabled="listPage === 1"
                        small
                        icon
                        @click.stop="listPage--"
                      >
                        <v-icon>mdi-chevron-left</v-icon>
                      </v-btn>
                      <v-btn
                        :disabled="listPage === Math.ceil(list.length / 20)"
                        small
                        icon
                        @click.stop="listPage++"
                      >
                        <v-icon>mdi-chevron-right</v-icon>
                      </v-btn>
                      <v-btn
                        :disabled="listPage === Math.ceil(list.length / 20)"
                        small
                        icon
                        @click.stop="listPage = Math.ceil(list.length / 20)"
                      >
                        <v-icon>mdi-chevron-double-right</v-icon>
                      </v-btn>
                    </v-row>
                  </v-card>
                </v-card>
              </v-menu>
            </v-list-item-action>
            <v-list-item-action class="my-0 mr-0" :class="{ 'ml-3': smAndUp }">
              <v-btn
                icon
                :small="!smAndUp"
                @click.stop="
                  loop = !loop;
                  audio.loop = loop;
                "
              >
                <v-icon :small="!smAndUp">{{
                  `mdi-${loop ? "sync" : "swap-horizontal"}`
                }}</v-icon>
              </v-btn>
            </v-list-item-action>
            <v-list-item-action class="my-0 mr-0" :class="{ 'ml-3': smAndUp }">
              <v-btn :small="!smAndUp" icon @click.stop="prevAudio">
                <v-icon :small="!smAndUp">mdi-skip-previous</v-icon>
              </v-btn>
            </v-list-item-action>
            <v-list-item-action class="my-0" :class="{ 'ml-3': smAndUp }">
              <v-btn
                :small="!smAndUp"
                icon
                @click.stop="playing ? audio.pause() : audio.play()"
              >
                <v-icon :small="!smAndUp">{{
                  `mdi-${playing ? "pause" : "play"}`
                }}</v-icon>
              </v-btn>
            </v-list-item-action>
            <v-list-item-action class="my-0" :class="{ 'ml-3': smAndUp }">
              <v-btn :small="!smAndUp" icon @click.stop="nextAudio">
                <v-icon :small="!smAndUp">mdi-skip-next</v-icon>
              </v-btn>
            </v-list-item-action>
            <v-list-item-action class="my-0" :class="smAndUp ? 'ml-3' : 'ml-0'">
              <v-btn
                :small="!smAndUp"
                icon
                @click.stop="
                  showAudio = false;
                  showPlayer = false;
                "
              >
                <v-icon :small="!smAndUp">mdi-close</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>
        <audio
          v-show="false"
          ref="audio"
          controls
          autoplay
          :src="source"
          @durationchange="duration = audio.duration"
          @timeupdate="seeking || loading || (currentTime = audio.currentTime)"
          @progress="onProgress"
          @play="playing = true"
          @pause="playing = false"
          @ended="nextAudio"
          @loadeddata="loading = false"
        ></audio>
      </v-card>
    </v-bottom-sheet>
    <v-fade-transition>
      <v-row
        v-show="cover && showPlayer"
        key="cover"
        justify="center"
        align="center"
        class="pa-5 ma-0"
        style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: calc(100vh - 112px);
          z-index: 201;
          pointer-events: none;
        "
      >
        <img :src="cover" style="max-width: 100%; max-height: 100%" />
      </v-row>
    </v-fade-transition>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Ref, Emit, Watch } from 'vue-property-decorator';
import network from '@/utils/network';
import storage from '@/utils/storage';

@Component({
  filters: {
    durationFormat(time: number): string {
      const minute = Math.floor(time / 60);
      const second = Math.floor(time) - minute * 60;
      return `${minute}: ${`0${second}`.slice(-2)}`;
    }
  }
})

export default class AudioPlayer extends Vue {
  @Ref() private readonly audio!: HTMLAudioElement

  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }

  @Prop(Number) private readonly repo!: number
  @Prop(Array) private readonly list!: { id: number; name: string; digest: string; cover: string }[]
  @PropSync('index') private audioIndex!: number
  @PropSync('show') private showAudio!: boolean

  private get playingAudio(): { name: string; digest: string; cover: string } {
    return this.list[this.audioIndex] ?? {};
  }
  private get smAndUp(): boolean {
    return this.$vuetify.breakpoint.smAndUp;
  }
  private get dark(): boolean {
    return this.$vuetify.theme.dark;
  }

  private showPlayer = false
  private currentTime = 0
  private duration = 0
  private loadedPercentage = 0
  private seeking = false
  private playing = false
  private volume = 100
  private muted = false
  private loop = false
  private loading = false
  private source = ''
  private cover = ''
  private listPage = 1

  @Watch('playingAudio')
  private async onSourceChange(): Promise<void> {
    this.currentTime = 0;
    this.duration = 0;
    this.loadedPercentage = 0;
    this.cover = '';
    if (!this.playingAudio.digest) {
      this.source = '';
      return;
    }
    this.loading = true;
    const repositories = await storage.getRepositories();
    const activeRepository = repositories.find(e => e.id === this.repo);
    if (activeRepository) {
      this.source = await network.getDownloadURL(this.playingAudio.digest, activeRepository);
      if (this.playingAudio.cover) this.cover = await network.getDownloadURL(this.playingAudio.cover, activeRepository);
    }
    else this.alert(`${this.$t('getRepositoryFailed')}`, 'error');
  }

  private nextAudio(): void {
    if (this.audioIndex === this.list.length - 1) this.audioIndex = 0;
    else this.audioIndex++;
  }
  private prevAudio(): void {
    if (this.audioIndex === 0) this.audioIndex = this.list.length - 1;
    else this.audioIndex--;
  }
  private onProgress(): void {
    let range = 0;
    const bf = this.audio.buffered;
    const time = this.audio.currentTime;
    if (time === this.audio.duration) return;
    try {
      while (!(bf.start(range) <= time && time <= bf.end(range))) {
        range += 1;
      }
      const loadEndPercentage = bf.end(range) / this.audio.duration;
      this.loadedPercentage = loadEndPercentage;
    }
    catch (e) { e; }
  }
}
</script>

<style scoped lang="scss">
.progress-bar {
  width: calc(100% - 16px);
  margin: 15px 8px;
  pointer-events: none;
  opacity: 0.4;
}
.volume-slider::v-deep .v-input__prepend-outer {
  margin-right: 0;
}
</style>