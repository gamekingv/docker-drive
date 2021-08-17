<template>
  <v-dialog
    v-model="showVideo"
    fullscreen
    content-class="black"
    transition="fade-transition"
  >
    <v-toolbar flat>
      <v-toolbar-title>{{ videoTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn class="ml-5" icon @click.stop="showVideo = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-toolbar>
    <div
      class="video"
      :style="`height: calc(100% - ${$vuetify.breakpoint.mdAndUp ? 64 : 56}px)`"
    >
      <video
        v-if="showVideo"
        ref="video"
        controls
        @pause="videoEventHandler"
        @play="videoEventHandler"
      >
        <source :src="videoURL" />
        <track
          v-for="(subtitle, index) in subtitles"
          :key="index"
          :label="subtitle.label"
          kind="subtitles"
          :src="subtitle.url"
        />
      </video>
    </div>
  </v-dialog>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Ref, Emit, Watch } from 'vue-property-decorator';
import { Repository } from '@/utils/types';
import network from '@/utils/network';
import { parse as ASSparser } from 'ass-compiler';

@Component

export default class VideoPlayer extends Vue {
  @Ref() private readonly video!: HTMLVideoElement

  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }

  @Prop() private readonly activeRepository!: Repository
  @Prop() private readonly source!: { name: string; url: string }
  @Prop(Array) private readonly tracks!: { name: string; url: string }[]
  @PropSync('show') showVideo!: boolean

  @Watch('showVideo')
  private async onshow(val: boolean): Promise<void> {
    if (val) {
      this.subtitles = [];
      for (const track of this.tracks) {
        try {
          const label = track.name.replace(this.videoTitle.substr(0, this.videoTitle.length - 3), '');
          if (/\.vtt$/.test(track.name)) this.subtitles.push({ label, url: track.url });
          else if (/\.srt$/.test(track.name)) {
            const { data: srt }: { data: string } = await network.downloadFile(track.url, this.activeRepository);
            const vtt = 'WEBVTT\r\n\r\n' + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3} --> \d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2.$3');
            this.subtitles.push({ label, url: URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })) });
          }
          else if (/\.(ass|ssa)$/.test(track.name)) {
            const { data: assString }: { data: string } = await network.downloadFile(track.url, this.activeRepository);
            const ass = ASSparser(assString);
            const textTrack = this.video.addTextTrack('subtitles', label);
            ass.events.dialogue.forEach(dialogue => dialogue.Text.combined !== '' && textTrack.addCue(new VTTCue(dialogue.Start, dialogue.End, dialogue.Text.combined.replace(/\\N/g, '\r\n'))));
          }
        }
        catch (error) {
          this.alert(`${this.$t('loadSubtitleFailed')}${track.name}`, 'warning');
        }
      }
      this.$nextTick(() => {
        [...this.video.textTracks].forEach(e => e.mode = 'hidden');
        setTimeout(() => {
          if (this.video.textTracks[0]) this.video.textTracks[0].mode = 'showing';
        }, 1000);
      });
    }
  }

  private isVideoPlay = false
  private subtitles: { label: string; url: string }[] = []

  private get videoURL(): string {
    return this.source.url;
  }
  private get videoTitle(): string {
    return this.source.name;
  }
  private videoEventHandler(e: Event): void {
    if (e.type === 'play') this.isVideoPlay = true;
    else this.isVideoPlay = false;
  }
}
</script>

<style scoped lang="scss">
.video {
  width: 100%;
  align-items: center;
  display: flex;
}
video {
  width: 100%;
  height: 100%;
}
video::cue {
  background-color: transparent;
  text-shadow: rgb(0 0 0) 1px 0px 1px, rgb(0 0 0) 0px 1px 1px,
    rgb(0 0 0) 0px -1px 1px, rgb(0 0 0) -1px 0px 1px;
}
</style>