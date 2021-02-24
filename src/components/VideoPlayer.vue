<template>
  <v-dialog v-model="showVideo" fullscreen content-class="video-container">
    <v-hover v-slot="{ hover }">
      <div class="video">
        <video
          v-if="showVideo"
          ref="video"
          class="video"
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
        <v-fade-transition>
          <v-overlay
            v-if="!isVideoPlay || hover"
            class="video-overlay"
            opacity="1"
            color="transparent"
          >
            <v-toolbar min-width="100vw" absolute color="transparent" flat>
              <v-toolbar-title>{{
                showVideo ? videoTitle : ""
              }}</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-btn
                style="pointer-events: auto"
                icon
                @click.stop="showVideo = false"
              >
                <v-icon large>mdi-close</v-icon>
              </v-btn>
            </v-toolbar>
          </v-overlay>
        </v-fade-transition>
      </div>
    </v-hover>
  </v-dialog>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Ref, Emit } from 'vue-property-decorator';
import axios from 'axios';
import { parse as ASSparser } from 'ass-compiler';

@Component

export default class VideoPlayer extends Vue {
  @Ref() private readonly video!: HTMLVideoElement

  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }

  @Prop(Object) private readonly source!: { name: string; url: string }
  @Prop(Array) private readonly tracks!: { name: string; url: string }[]
  @PropSync('show') showVideo!: boolean

  private isVideoPlay = false
  private subtitles: { label: string; url: string }[] = []

  private get videoURL(): string {
    return this.source.url;
  }
  private get videoTitle(): string {
    return this.source.name;
  }

  private async mounted(): Promise<void> {
    for (const track of this.tracks) {
      try {
        const label = track.name.replace(this.videoTitle.substr(0, this.videoTitle.length - 3), '');
        if (/\.vtt$/.test(track.name)) this.subtitles.push({ label, url: track.url });
        else if (/\.srt$/.test(track.name)) {
          const { data: srt }: { data: string } = await axios.get(track.url);
          const vtt = 'WEBVTT\r\n\r\n' + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3} --> \d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2.$3');
          this.subtitles.push({ label, url: URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })) });
        }
        else if (/\.(ass|ssa)$/.test(track.name)) {
          const { data: assString }: { data: string } = await axios.get(track.url);
          const ass = ASSparser(assString);
          const textTrack = this.video.addTextTrack('subtitles', label);
          ass.events.dialogue.forEach(dialogue => dialogue.Text.combined !== '' && textTrack.addCue(new VTTCue(dialogue.Start, dialogue.End, dialogue.Text.combined.replace('\\N', '\r\n'))));
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
  private videoEventHandler(e: Event): void {
    if (e.type === 'play') this.isVideoPlay = true;
    else this.isVideoPlay = false;
  }
}
</script>

<style scoped lang="scss">
.video {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  display: flex;
}
video::cue {
  background-color: rgba(0, 0, 0, 0.4);
}
.video-overlay {
  background-image: linear-gradient(black, transparent 25%);
  pointer-events: none;
  align-items: unset;
  justify-content: unset;
}
</style>

<style lang="scss">
.video-container {
  overflow: hidden;
  background-color: black;
  display: flex;
}
</style>