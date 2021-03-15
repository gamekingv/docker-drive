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
  </v-container>
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from 'vue-property-decorator';
import storage from '@/utils/storage';

@Component

export default class Settings extends Vue {

  @Prop({ type: String, default: '' }) private readonly url!: string

  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }
  @Emit()
  private setTheme(theme: string): void { theme; }

  private address = ''
  private secret = ''
  private validate = true
  private theme = 'browser'

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