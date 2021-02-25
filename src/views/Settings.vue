<template>
  <v-container fluid>
    <v-row>
      <v-subheader>Aria2</v-subheader>
    </v-row>
    <v-form v-model="validate">
      <v-row>
        <v-col cols="12" sm="6" class="py-0">
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
          ></v-text-field>
        </v-col>
      </v-row>
    </v-form>
    <v-row>
      <v-col>
        <v-btn color="blue darken-1" :disabled="!validate" @click.stop="save()">
          {{ $t("save") }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import storage from '@/utils/storage';

@Component

export default class Settings extends Vue {

  @Prop({ type: String, default: '' }) private readonly url!: string

  private address = ''
  private secret = ''
  private validate = true

  private async created(): Promise<void> {
    const { aria2 }: { aria2: { address: string; secret: string } } = await storage.getValue('aria2');
    this.address = aria2?.address ?? '';
    this.secret = aria2?.secret ?? '';
  }
  private save(): void {
    storage.setValue('aria2', {
      address: this.address,
      secret: this.secret
    });
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