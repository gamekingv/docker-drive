<template>
  <div>
    <v-list class="grey darken-3" two-line>
      <template v-for="(repository, index) in repositories">
        <v-list-item :key="repository.value">
          <v-list-item-avatar>
            <v-btn
              icon
              class="transparent"
              @click="activeRepositoryID = repository.value"
            >
              <v-icon
                class="transparent"
                :color="
                  repository.value === activeRepositoryID ? 'green' : 'grey'
                "
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
          <v-list-item-action>
            <v-btn icon @click="editAction(repository)">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action>
            <v-btn icon @click="deleteAction(repository.value)">
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
    </v-list>
    <v-dialog v-model="action" persistent scrollable :max-width="400">
      <v-card>
        <v-card-title>
          <span v-if="actionType === 'edit'" class="headline">{{
            $t("edit")
          }}</span>
          <span v-if="actionType === 'delete'">{{
            $t("deleteRepository", [
              repositories.find((e) => e.value === id)
                ? repositories.find((e) => e.value === id).name
                : "",
            ])
          }}</span>
        </v-card-title>
        <v-card-text v-if="actionType === 'edit'">
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
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            @click.stop="
              actionType === 'edit'
                ? form.validate() && edit()
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

@Component

export default class Repositories extends Vue {
  @Ref() private readonly form!: VForm

  @Emit()
  private edit(): Repository {
    let secret = '';
    const name = this.name, url = this.url, value = this.id;
    if (this.username) secret = btoa(`${this.username}:${this.password}`);
    this.closeForm();
    return { name, url, token: '', value, secret };
  }
  @Emit('delete')
  private deleteRepository(): number {
    this.closeForm();
    return this.id;
  }

  @Prop(Array) private readonly repositories!: Repository[]
  @PropSync('active') private activeRepositoryID!: number

  private action = false
  private actionType = ''
  private name = ''
  private url = ''
  private id = 0
  private username = ''
  private password = ''

  private editAction(repository: Repository): void {
    this.actionType = 'edit';
    this.name = repository.name;
    this.url = repository.url;
    this.id = repository.value;
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
}
</script>