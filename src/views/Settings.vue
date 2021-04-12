<template>
  <v-container fluid>
    <v-row>
      <v-subheader>Aria2</v-subheader>
    </v-row>
    <v-form v-model="validate">
      <v-row>
        <v-col cols="12" sm="6" class="pb-0">
          <v-text-field
            value="POST"
            :label="$t('RPC.requestMethod')"
            readonly
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" sm="6" class="py-0">
          <v-text-field
            v-model="address"
            :rules="[
              (v) => !v || /https?:\/\//.test(v) || $t('RPC.addressProtocol'),
            ]"
            :label="$t('RPC.address')"
            placeholder="http://localhost:6800/jsonrpc"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" sm="6" class="py-0">
          <v-text-field
            v-model="secret"
            :label="$t('RPC.secret')"
            type="password"
          ></v-text-field>
        </v-col>
      </v-row>
      <v-row>
        <v-subheader>{{ $t("theme") }}</v-subheader>
      </v-row>
      <v-row>
        <v-col class="pt-0">
          <v-radio-group v-model="theme" class="mt-0" row>
            <v-radio :label="$t('dark')" value="dark"></v-radio>
            <v-radio :label="$t('light')" value="light"></v-radio>
            <v-radio :label="$t('browserSetting')" value="browser"></v-radio>
          </v-radio-group>
        </v-col>
      </v-row>
    </v-form>
    <v-row>
      <v-col>
        <v-btn color="primary" :disabled="!validate" @click.stop="save()">
          {{ $t("save") }}
        </v-btn>
      </v-col>
    </v-row>
    <v-row class="mt-10">
      <v-subheader>{{ $t("recovery.title") }}</v-subheader>
      <v-tooltip top nudge-top="-20" transition="fade-transition">
        <template v-slot:activator="{ on, attrs }">
          <v-icon v-bind="attrs" small v-on="on"
            >mdi-alert-circle-outline</v-icon
          >
        </template>
        <span>{{ $t("recovery.hint") }}</span>
      </v-tooltip>
    </v-row>
    <v-row>
      <v-col class="pt-0">
        <v-btn color="primary" :disabled="!active" @click.stop="recover()">
          {{ $t("recovery.button") }}
        </v-btn>
        <v-btn
          class="ml-5"
          color="primary"
          :disabled="!active"
          @click.stop="action = true"
        >
          {{ $t("recovery.manual.button") }}
        </v-btn>
      </v-col>
    </v-row>
    <v-dialog v-model="action" persistent scrollable :max-width="600">
      <v-card class="overflow-hidden">
        <v-card-title>{{ $t("recovery.manual.title") }}</v-card-title>
        <v-card-subtitle class="mt-0">{{
          $t("recovery.manual.hint")
        }}</v-card-subtitle>
        <v-card-text class="overflow-x-hidden">
          <v-container>
            <v-form ref="form" lazy-validation>
              <v-row v-for="(file, index) in lostFiles" :key="index">
                <v-col cols="8">
                  <v-text-field
                    v-model="file.digest"
                    :rules="[
                      (v) => !!v && /^[A-Za-z0-9]+$/.test(v) && v.length === 64,
                    ]"
                    label="Digest"
                    prefix="sha256:"
                    dense
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model="file.size"
                    :rules="[
                      (v) => !!v && v > 0 && Number.isInteger(Number(v)),
                    ]"
                    :label="$t('fileSize')"
                    suffix="B"
                    type="number"
                    dense
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>
            <v-row align="center" justify="center">
              <v-btn
                icon
                large
                @click.stop="lostFiles.push({ digest: '', size: null })"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click.stop="form.validate() && ManualRecover()"
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn
            color="error"
            text
            @click.stop="
              action = false;
              lostFiles = [];
            "
          >
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit, Ref } from 'vue-property-decorator';
import { Manifest, Repository, VForm } from '@/utils/types';
import storage from '@/utils/storage';
import network from '@/utils/network';

@Component

export default class Settings extends Vue {
  @Ref() private readonly form!: VForm

  @Emit()
  private loading(): void { return; }
  @Emit()
  private loaded(): void { return; }
  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { ({ authenticateHeader, fn }); }
  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }
  @Emit()
  private setTheme(theme: string): void { theme; }

  @Prop(Array) private readonly repositories!: Repository[]
  @Prop(Number) private active!: number

  private get activeRepository(): Repository | undefined {
    return this.repositories.find(e => e.id === this.active);
  }

  private address = ''
  private secret = ''
  private validate = true
  private theme = 'browser'
  private action = false
  private lostFiles: { digest: string; size: number }[] = []

  private async created(): Promise<void> {
    const { aria2 }: { aria2: { address: string; secret: string } } = await storage.getValue('aria2');
    const { theme = 'browser' }: { theme: string } = await storage.getValue('theme');
    this.address = aria2?.address ?? '';
    this.secret = aria2?.secret ?? '';
    this.theme = theme ?? 'browser';
  }
  private async save(): Promise<void> {
    this.setTheme(this.theme);
    await storage.setValue('aria2', {
      address: this.address,
      secret: this.secret
    });
    await storage.setValue('theme', this.theme);
    this.alert(`${this.$t('saved')}`, 'success');
  }
  private async recover(manualLayers?: Manifest[]): Promise<void> {
    this.loading();
    try {
      const { config, layers = manualLayers ?? [] } = await network.getManifests(this.activeRepository as Repository);
      const files = network.parseConfig(config);
      const filesString = JSON.stringify(files);
      const lostFiles = layers.filter(layer => !filesString.includes(layer.digest));
      if (lostFiles.length > 0) {
        let lostFilesFolder = files.find(file => file.name === 'LOST_FILE');
        if (!lostFilesFolder) {
          lostFilesFolder = { name: 'LOST_FILE', type: 'folder', id: Symbol(), files: [], uploadTime: Date.now() };
          files.push(lostFilesFolder);
        }
        lostFilesFolder.files?.push(...lostFiles.map(file => ({
          name: file.digest,
          type: 'file',
          digest: file.digest,
          size: file.size,
          uploadTime: Date.now(),
          id: Symbol()
        })));
        await network.commit({ files, layers }, this.activeRepository as Repository);
        this.alert(`${this.$t('recovery.success', [lostFiles.length])}`, 'success');
      }
      else this.alert(`${this.$t('recovery.nothing')}`, 'warning');
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private async ManualRecover(): Promise<void> {
    this.loading();
    this.action = false;
    const { config, layers } = await network.getManifests(this.activeRepository as Repository);
    const files = network.parseConfig(config);
    const layersString = JSON.stringify(layers);
    const validFiles = this.lostFiles.filter(file => !layersString.includes(file.digest));
    if (validFiles.length > 0) {
      layers.push(...validFiles.map(file => ({
        mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip',
        digest: `sha256:${file.digest.toLowerCase()}`,
        size: Number(file.size)
      })));
      try {
        await network.commit({ files, layers }, this.activeRepository as Repository);
        await this.recover();
      }
      catch (error) {
        if (error.response?.status === 400) this.alert(`${this.$t('recovery.manual.error')}`, 'error');
        else if (error.message === 'need login') this.login(error.authenticateHeader);
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
        this.loaded();
      }
    }
    else {
      this.loaded();
      this.alert(`${this.$t('recovery.nothing')}`, 'warning');
    }
    this.lostFiles = [];
  }
}
</script>

<style scoped lang="scss">
.image {
  max-width: 100%;
  max-height: 100%;
}
.mask {
  background-color: rgb(33, 33, 33, 0.46);
  border-color: rgb(33, 33, 33, 0.46);
}
</style>