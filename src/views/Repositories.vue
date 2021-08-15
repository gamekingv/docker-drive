<template>
  <div class="fill-height">
    <v-item-group
      v-if="repositories.length > 0"
      v-model="activeRepositoryID"
      mandatory
    >
      <v-row dense>
        <v-col cols="12" md="4" sm="6">
          <v-sheet
            class="overflow-hidden"
            outlined
            rounded
            @click.stop="addAction()"
          >
            <v-list-item v-blur link>
              <v-list-item-content>
                <v-icon large>mdi-plus</v-icon>
              </v-list-item-content>
            </v-list-item>
          </v-sheet>
        </v-col>
        <v-item
          v-for="repository in repositories"
          v-slot="{ active, toggle }"
          :key="repository.id"
          :value="repository.id"
        >
          <v-col cols="12" md="4" sm="6">
            <v-sheet
              class="overflow-hidden"
              rounded
              outlined
              @click.stop="toggle"
            >
              <v-list-item
                v-blur
                :input-value="active"
                :color="`grey darken-${$vuetify.theme.dark ? 1 : 3}`"
                link
              >
                <v-list-item-avatar>
                  <v-icon
                    v-if="repository.secret"
                    class="transparent"
                    color="green"
                    >mdi-lock-check</v-icon
                  >
                  <v-icon v-else class="transparent" color="amber"
                    >mdi-lock</v-icon
                  >
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title class="text--primary">{{
                    repository.name
                  }}</v-list-item-title>
                  <v-list-item-subtitle>{{
                    repository.url
                  }}</v-list-item-subtitle>
                </v-list-item-content>
                <v-list-item-action v-if="repository.useDatabase" class="ml-4">
                  <v-tooltip top :open-delay="300">
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        small
                        icon
                        v-bind="attrs"
                        v-on="on"
                        @click.stop="initialDatabase(repository)"
                      >
                        <v-icon small>mdi-database-sync</v-icon>
                      </v-btn>
                    </template>
                    <span>{{ $t("repository.synchronizeTo") }}</span>
                  </v-tooltip>
                </v-list-item-action>
                <v-list-item-action class="ml-2">
                  <v-tooltip top :open-delay="300">
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        small
                        icon
                        v-bind="attrs"
                        v-on="on"
                        @click.stop="editAction(repository)"
                      >
                        <v-icon small>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <span>{{ $t("edit") }}</span>
                  </v-tooltip>
                </v-list-item-action>
                <v-list-item-action class="ml-2">
                  <v-tooltip top :open-delay="300">
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn
                        small
                        icon
                        v-bind="attrs"
                        v-on="on"
                        @click.stop="deleteAction(repository.id)"
                      >
                        <v-icon small>mdi-trash-can-outline</v-icon>
                      </v-btn>
                    </template>
                    <span>{{ $t("delete") }}</span>
                  </v-tooltip>
                </v-list-item-action>
              </v-list-item>
            </v-sheet>
          </v-col>
        </v-item>
      </v-row>
    </v-item-group>
    <v-row v-else class="fill-height pa-15" align="center" justify="center">
      <v-sheet
        class="d-flex justify-center align-center pa-3"
        height="100%"
        width="100%"
        min-height="100px"
        min-width="200px"
        rounded
        outlined
      >
        <v-btn depressed @click.stop="addAction()">
          <v-icon left>mdi-plus</v-icon>{{ $t("repository.add") }}</v-btn
        >
      </v-sheet>
    </v-row>
    <v-dialog v-model="action" persistent scrollable :max-width="400">
      <v-card>
        <v-card-title>
          <span>{{ $t(formValue.type) }}</span>
          <v-spacer></v-spacer>
          <v-btn plain icon>
            <v-icon @click.stop="action = false">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="py-0">
          <v-container class="px-0">
            <v-form ref="form" v-model="formValidation" @submit.prevent>
              <v-row v-if="formValue.type === 'delete'" no-gutters>
                <v-col cols="12">{{
                  $t("deleteRepository", [
                    repositories.find((e) => e.id === id)
                      ? repositories.find((e) => e.id === id).name
                      : "",
                  ])
                }}</v-col>
              </v-row>
              <v-row v-else no-gutters>
                <v-col cols="12">
                  <v-text-field
                    v-model="formValue.name"
                    outlined
                    dense
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  >
                    <template v-slot:label>
                      {{ $t("repository.name")
                      }}<span class="red--text">*</span>
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="formValue.url"
                    outlined
                    dense
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  >
                    <template v-slot:label>
                      {{ $t("repository.url") }}<span class="red--text">*</span>
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="formValue.username"
                    outlined
                    dense
                    :label="$t('account')"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="formValue.password"
                    outlined
                    dense
                    :label="$t('password')"
                    type="password"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="formValue.useDatabase"
                    :label="$t('database.use')"
                    dense
                    hint="* 测试功能，请勿随意开启"
                    persistent-hint
                  ></v-checkbox>
                </v-col>
                <v-col v-if="formValue.useDatabase" class="mt-2" cols="12">
                  <v-text-field
                    v-model="formValue.databaseURL"
                    outlined
                    dense
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  >
                    <template v-slot:label>
                      {{ $t("database.url") }}<span class="red--text">*</span>
                    </template>
                  </v-text-field>
                </v-col>
                <v-col v-if="formValue.useDatabase" cols="12">
                  <v-text-field
                    v-model="formValue.databaseApiKey"
                    outlined
                    dense
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  >
                    <template v-slot:label>
                      API KEY<span class="red--text">*</span>
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            depressed
            :disabled="!formValidation"
            @click.stop="
              formValue.type === 'edit'
                ? edit()
                : formValue.type === 'add'
                ? add()
                : formValue.type === 'delete' && deleteRepository()
            "
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn color="error" text @click.stop="action = false">
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Ref, Emit, Watch } from 'vue-property-decorator';
import { Repository, VForm } from '@/utils/types';
import network from '@/utils/network';
import database from '@/utils/database';
import storage from '@/utils/storage';

@Component

export default class Repositories extends Vue {
  @Ref() private readonly form!: VForm

  @Emit()
  private loading(): void { return; }
  @Emit()
  private loaded(): void { return; }
  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { authenticateHeader; fn; }
  @Emit()
  private alert(text: string, type?: string, error?: Error): void { text; type; error; }

  @Prop(String) private readonly initialType!: string

  private action = false
  private readonly defaultFormValue: {
    type: string;
    name: string;
    url: string;
    username: string;
    password: string;
    useDatabase: boolean;
    databaseURL: string;
    databaseApiKey: string;
  } = {
      type: '',
      name: '',
      url: '',
      username: '',
      password: '',
      useDatabase: false,
      databaseURL: '',
      databaseApiKey: ''
    }
  private formValue = Object.assign({}, this.defaultFormValue)
  private formValidation = true
  private id = 0
  private repositories: Repository[] = []
  private activeRepositoryID = 0

  @Watch('activeRepositoryID')
  private async onActiveRepositoryIDChange(val: number): Promise<void> {
    await storage.setValue('active', val);
  }

  private async created(): Promise<void> {
    this.repositories = await storage.getRepositories();
    this.activeRepositoryID = await storage.getActiveID();
    if (this.initialType === 'add') this.addAction();
  }
  private editAction(repository: Repository): void {
    this.resetForm({
      type: 'edit',
      name: repository.name,
      url: repository.url,
      useDatabase: repository.useDatabase ?? false,
      databaseURL: repository.databaseURL ?? '',
      databaseApiKey: repository.databaseApiKey ?? ''
    });
    this.id = repository.id;
    this.action = true;
  }
  private addAction(): void {
    this.resetForm({ type: 'add' });
    this.action = true;
  }
  private deleteAction(id: number): void {
    this.resetForm({ type: 'delete' });
    this.id = id;
    this.action = true;
  }
  private resetForm(value?: {
    type: string;
    name?: string;
    url?: string;
    username?: string;
    password?: string;
    useDatabase?: boolean;
    databaseURL?: string;
    databaseApiKey?: string;
  }): void {
    Object.assign(this.formValue, this.defaultFormValue, value);
    this.form?.resetValidation();
  }
  private async add(): Promise<void> {
    this.action = false;
    let secret = '';
    const { name, url, username, password, useDatabase } = this.formValue;
    const id = Date.now();
    const databaseURL = useDatabase ? this.formValue.databaseURL : '';
    const databaseApiKey = useDatabase ? this.formValue.databaseApiKey : '';
    if (username) secret = btoa(`${username}:${password}`);
    const newRepository = { name, url, id, secret, useDatabase, databaseURL, databaseApiKey };
    this.repositories.push(newRepository);
    await storage.setValue('repositories', this.repositories);
    this.activeRepositoryID = id;
  }
  private async edit(): Promise<void> {
    this.action = false;
    let secret = '';
    const { name, url, username, password, useDatabase } = this.formValue;
    const id = this.id;
    const databaseURL = useDatabase ? this.formValue.databaseURL : '';
    const databaseApiKey = useDatabase ? this.formValue.databaseApiKey : '';
    if (username) secret = btoa(`${username}:${password}`);
    const repository = this.repositories.find(e => e.id === id) as Repository;
    Object.assign(repository, { name, url, useDatabase, databaseURL, databaseApiKey });
    if (secret) repository.secret = secret;
    await storage.setValue('repositories', this.repositories);
  }
  private async deleteRepository(): Promise<void> {
    this.action = false;
    const id = this.id;
    this.repositories.splice(this.repositories.findIndex(e => e.id === id), 1);
    if (this.activeRepositoryID === id) {
      const newActiveId = this.repositories[0]?.id ?? 0;
      this.activeRepositoryID = newActiveId;
    }
    await storage.setValue('repositories', this.repositories);
  }
  private async initialDatabase(repository: Repository): Promise<void> {
    try {
      this.loading();
      const { config } = await network.getManifests(repository);
      await database.initialize(config, repository);
      const newConfig = await database.list(repository);
      await network.commit(newConfig, repository);
      this.loaded();
    }
    catch (error) {
      this.loaded();
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
  }
}
</script>