<template>
  <div class="fill-height">
    <v-list v-if="repositories.length > 0" class="transparent" two-line>
      <template v-for="(repository, index) in repositories">
        <v-list-item :key="repository.id">
          <v-list-item-avatar>
            <v-btn
              icon
              class="transparent"
              @click.stop="activeRepositoryID = repository.id"
            >
              <v-icon
                class="transparent"
                :color="repository.id === activeRepositoryID ? 'green' : 'grey'"
                >mdi-check</v-icon
              >
            </v-btn>
          </v-list-item-avatar>
          <v-list-item-avatar>
            <v-icon v-if="repository.secret" class="transparent" color="green"
              >mdi-lock-check</v-icon
            >
            <v-icon v-else class="transparent" color="amber">mdi-lock</v-icon>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>{{ repository.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ repository.url }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action v-if="repository.useDatabase" class="ml-4">
            <v-btn icon @click.stop="initialDatabase(repository)">
              <v-icon>mdi-database-sync</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action class="ml-2">
            <v-btn icon @click.stop="editAction(repository)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action class="ml-2">
            <v-btn icon @click.stop="deleteAction(repository.id)">
              <v-icon>mdi-trash-can-outline</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
        <v-divider
          v-if="index < repositories.length - 1"
          :key="index"
          inset
        ></v-divider>
      </template>
      <v-list-item class="d-flex justify-center">
        <v-btn icon large @click.stop="addAction()">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-list-item>
    </v-list>
    <v-row v-else class="fill-height" align="center" justify="center">
      <v-card
        color="transparent"
        class="d-flex justify-center align-center"
        outlined
        style="border-style: dashed; border-color: #616161 !important"
        width="80%"
        height="80%"
      >
        <v-card-text class="text-center">
          <v-btn color="primary" @click.stop="addAction()">
            <v-icon left>mdi-plus</v-icon>{{ $t("add") }}</v-btn
          >
        </v-card-text>
      </v-card>
    </v-row>
    <v-dialog v-model="action" persistent scrollable :max-width="400">
      <v-card>
        <v-card-title>
          <span
            v-if="actionType === 'edit' || actionType === 'add'"
            class="headline"
            >{{ $t(actionType) }}</span
          >
          <span v-if="actionType === 'delete'">{{
            $t("deleteRepository", [
              repositories.find((e) => e.id === id)
                ? repositories.find((e) => e.id === id).name
                : "",
            ])
          }}</span>
        </v-card-title>
        <v-card-text v-if="actionType === 'edit' || actionType === 'add'">
          <v-container>
            <v-form ref="form" lazy-validation>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="name"
                    :label="$t('repository.name')"
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="url"
                    :label="$t('repository.url')"
                    :rules="[(v) => !!v || $t('require')]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="username"
                    :label="$t('account')"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="password"
                    :label="$t('password')"
                    type="password"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    v-model="useDatabase"
                    :label="$t('database.use')"
                    hint="* 测试功能，请勿开启"
                    persistent-hint
                  ></v-checkbox>
                </v-col>
                <v-col v-if="useDatabase" cols="12">
                  <v-text-field
                    v-model="databaseURL"
                    :label="$t('database.url')"
                    :rules="[(v) => !useDatabase || !!v || $t('require')]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col v-if="useDatabase" cols="12">
                  <v-text-field
                    v-model="databaseApiKey"
                    label="API KEY"
                    :rules="[(v) => !useDatabase || !!v || $t('require')]"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click.stop="
              actionType === 'edit'
                ? form.validate() && edit()
                : actionType === 'add'
                ? form.validate() && add()
                : deleteRepository()
            "
          >
            {{ $t("ok") }}
          </v-btn>
          <v-btn color="error" text @click.stop="closeForm()">
            {{ $t("cancel") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Ref, Emit } from 'vue-property-decorator';
import { Repository, VForm } from '@/utils/types';
import network from '@/utils/network';
import database from '@/utils/database';

@Component

export default class Repositories extends Vue {
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
  private add(): Repository {
    let secret = '';
    const name = this.name, url = this.url, id = Date.now();
    const useDatabase = this.useDatabase, databaseURL = this.useDatabase ? this.databaseURL : '';
    const databaseToken = { apikey: useDatabase ? this.databaseApiKey : '', token: '', expiration: 0 };
    if (this.username) secret = btoa(`${this.username}:${this.password}`);
    this.closeForm();
    return { name, url, token: '', id, secret, useDatabase, databaseURL, databaseToken };
  }
  @Emit()
  private edit(): Repository {
    let secret = '';
    const name = this.name, url = this.url, id = this.id;
    const useDatabase = this.useDatabase, databaseURL = useDatabase ? this.databaseURL : '';
    const databaseToken = { apikey: useDatabase ? this.databaseApiKey : '', token: '', expiration: 0 };
    if (this.username) secret = btoa(`${this.username}:${this.password}`);
    this.closeForm();
    return { name, url, token: '', id, secret, useDatabase, databaseURL, databaseToken };
  }
  @Emit('delete')
  private deleteRepository(): number {
    this.closeForm();
    return this.id;
  }

  @Prop(String) private readonly initialType!: string
  @Prop(Array) private readonly repositories!: Repository[]
  @PropSync('active') private activeRepositoryID!: number

  private action = false
  private actionType = ''
  private name = ''
  private url = ''
  private id = 0
  private username = ''
  private password = ''
  private useDatabase = false
  private databaseURL = ''
  private databaseApiKey = ''

  private created(): void {
    if (this.initialType === 'add') this.addAction();
  }
  private editAction(repository: Repository): void {
    this.actionType = 'edit';
    this.name = repository.name;
    this.url = repository.url;
    this.id = repository.id;
    this.useDatabase = repository.useDatabase ?? false;
    this.databaseURL = repository.databaseURL ?? '';
    this.databaseApiKey = repository.databaseToken?.apikey ?? '';
    this.action = true;
  }
  private addAction(): void {
    this.actionType = 'add';
    this.action = true;
  }
  private deleteAction(id: number): void {
    this.actionType = 'delete';
    this.id = id;
    this.action = true;
  }
  private closeForm(): void {
    if (this.form) {
      this.form.reset();
      this.form.resetValidation();
    }
    this.action = false;
  }
  private async initialDatabase(repository: Repository): Promise<void> {
    try {
      this.loading();
      const { config } = await network.getManifests(repository);
      const files = network.parseConfig(config);
      await database.initialize(files, repository);
      const newConfig = await database.list(repository);
      await network.commit(newConfig, repository);
      this.loaded();
    }
    catch (error) {
      this.loaded();
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error?.toString()}`, 'error');
    }
  }
}
</script>