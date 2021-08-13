<template>
  <div v-if="repositories.length > 0">
    <v-row align="center">
      <v-col cols="12" md="5" sm="7" xs="3" class="py-0">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          item-value="id"
          :label="$t('selectRepository')"
          :background-color="$vuetify.theme.dark ? '' : 'grey lighten-3'"
          solo
          flat
          hide-details
          @input="
            $router.push({
              name: 'Files',
              params: { repository: `${$event}` },
              query: { pn: $route.query.pn },
            })
          "
        >
          <template v-slot:append-item>
            <v-divider class="mt-2"></v-divider>
            <v-list-item ripple to="/repositories?type=add">
              <v-list-item-action>
                <v-icon color="green" left> mdi-plus </v-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{
                  $t("repository.add")
                }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </template>
          <template
            v-if="activeRepository && activeRepository.useDatabase"
            v-slot:append-outer
          >
            <v-tooltip top :open-delay="300">
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  style="margin-top: -6px"
                  v-bind="attrs"
                  v-on="on"
                  @click.stop="refresh()"
                >
                  <v-icon>mdi-sync</v-icon>
                </v-btn>
              </template>
              <span>{{ $t("repository.synchronizeWith") }}</span>
            </v-tooltip>
          </template>
        </v-select>
      </v-col>
      <v-spacer></v-spacer>
      <v-col class="text-right py-sm-0 pl-sm-0">
        <v-chip label small outlined>
          {{ `${layers.length}${$t("statistics")}`
          }}{{
            layers.reduce((total, layer) => (total += layer.size), 0)
              | sizeFormat
          }}
        </v-chip>
      </v-col>
    </v-row>
    <v-row align="center">
      <v-col cols="12" sm="7" xs="6">
        <input
          v-show="false"
          ref="getFiles"
          type="file"
          name="files"
          multiple
          @input="getFiles.files && upload(Array.from(getFiles.files))"
        />
        <input
          v-show="false"
          ref="getFolder"
          type="file"
          name="folder"
          webkitdirectory
          multiple
          @input="getFolder.files && upload(Array.from(getFolder.files))"
        />
        <v-btn-toggle active-class="no-active" dense borderless>
          <v-menu transition="slide-y-transition" offset-y>
            <template v-slot:activator="{ on, attrs }">
              <v-btn class="pa-3" v-bind="attrs" v-on="on"
                ><v-icon left>mdi-plus</v-icon>{{ $t("new") }}</v-btn
              >
            </template>
            <v-list dense>
              <v-list-item
                :disabled="disableOperate || !!$route.query.search"
                @click="addFolderAction()"
              >
                <v-icon left>mdi-folder-plus-outline</v-icon>
                <v-list-item-title>{{ $t("newFolder") }}</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item
                :disabled="!!$route.query.search"
                @click="getFiles.click()"
              >
                <v-icon left>mdi-file-upload</v-icon>
                <v-list-item-title>{{ $t("uploadFiles") }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                :disabled="!!$route.query.search"
                @click="getFolder.click()"
              >
                <v-icon left>mdi-folder-upload</v-icon>
                <v-list-item-title>{{ $t("uploadFolder") }}</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item :disabled="disableOperate" @click="recoveryAction()">
                <v-icon left>mdi-file-restore</v-icon>
                <v-list-item-title>{{
                  $t("recovery.button")
                }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-menu
            v-if="selectedFiles.length > 0"
            transition="slide-y-transition"
            offset-y
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                style="border-left-width: thin"
                :width="36"
                :min-width="0"
                v-bind="attrs"
                v-on="on"
                ><v-icon small>mdi-dots-vertical</v-icon></v-btn
              >
            </template>
            <v-list dense>
              <v-list-item
                v-if="
                  selectedFiles.length === 1 &&
                  selectedFiles[0].type !== 'folder'
                "
                @click="itemClick(selectedFiles[0], true)"
              >
                <v-icon left>mdi-download</v-icon>
                <v-list-item-title>{{ $t("download") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :disabled="disableOperate" @click="moveAction()">
                <v-icon left>mdi-file-move</v-icon>
                <v-list-item-title>{{ $t("move") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :disabled="disableOperate" @click="removeAction()">
                <v-icon left>mdi-trash-can-outline</v-icon>
                <v-list-item-title>{{ $t("delete") }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="selectedFiles.length === 1"
                :disabled="disableOperate"
                @click="renameAction(selectedFiles[0])"
              >
                <v-icon left>mdi-rename-box</v-icon>
                <v-list-item-title>{{ $t("rename") }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="selectedFiles.some((item) => item.type === 'file')"
                @click="copyDownloadLinks()"
              >
                <v-icon left>mdi-link</v-icon>
                <v-list-item-title>{{
                  $t("copyDownloadLinks")
                }}</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item @click="copyAria2DownloadText()">
                <v-icon left>mdi-download-box</v-icon>
                <v-list-item-title>{{
                  $t("copyAria2DownloadText")
                }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="sendToAria2()">
                <v-icon left>mdi-auto-download</v-icon>
                <v-list-item-title>{{ $t("sendToAria2") }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-btn-toggle>
      </v-col>
      <v-col cols="12" sm="5" xs="6">
        <v-text-field
          v-model="searchText"
          class="py-0"
          :label="
            searchRecursive ? $t('searchRecursiveHint') : $t('searchHint')
          "
          :background-color="$vuetify.theme.dark ? '' : 'grey lighten-3'"
          solo
          flat
          dense
          hide-details
          single-line
          clearable
          :append-icon="searchText ? 'mdi-magnify' : ''"
          @click:append="search"
          @keyup.enter="search"
          @click:clear="
            searchText = '';
            search();
          "
        >
          <template v-slot:prepend-inner>
            <v-tooltip top :open-delay="300">
              <template v-slot:activator="{ on }">
                <v-hover v-slot="{ hover }">
                  <v-icon
                    :color="searchRecursive ? 'primary' : hover ? '' : 'grey'"
                    class="clickable"
                    v-on="on"
                    @click.stop="searchRecursive = !searchRecursive"
                  >
                    mdi-folder-search-outline
                  </v-icon>
                </v-hover>
              </template>
              {{ $t("searchRecursiveTips") }}
            </v-tooltip>
          </template>
        </v-text-field>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="pt-0">
        <v-sheet outlined rounded>
          <v-data-table
            v-model="selectedFiles"
            :page.sync="listPage"
            :items="displayList"
            :items-per-page.sync="listPerPage"
            :item-key="!$route.query.search ? 'name' : 'id'"
            show-select
            hide-default-footer
            :hide-default-header="dataLoading"
            :loading="dataLoading"
            :sort-by.sync="listSortBy"
            :sort-desc.sync="listSortDesc"
            :headers="[
              { text: $t('filename'), align: 'start', value: 'name' },
              { text: $t('fileSize'), value: 'size' },
              { text: $t('fileUploadTime'), value: 'uploadTime' },
            ]"
            @page-count="listPageCount = $event"
            @contextmenu:row="showRightClickMenu"
          >
            <template v-slot:top>
              <v-breadcrumbs v-if="$route.query.search" class="pa-2">
                <v-btn
                  class="my-1 px-2 breadcrumb-button"
                  text
                  small
                  max-width="100%"
                  :min-width="0"
                  disabled
                  >{{ $t("searchTitle1", [$route.query.search]) }}</v-btn
                >
                <v-btn
                  class="my-1 px-2 breadcrumb-button"
                  text
                  small
                  max-width="100%"
                  :min-width="0"
                  :to="{
                    path: `/files/${activeRepositoryID}${
                      breadcrumbsPath[breadcrumbsPath.length - 1].path
                        ? `/${breadcrumbsPath[breadcrumbsPath.length - 1].path}`
                        : ''
                    }`,
                    query: { pn: $route.query.pn },
                  }"
                  exact
                  >{{ breadcrumbsPath[breadcrumbsPath.length - 1].name }}</v-btn
                >
                <v-btn
                  class="my-1 px-2 breadcrumb-button"
                  text
                  small
                  max-width="100%"
                  :min-width="0"
                  disabled
                  >{{ $t("searchTitle2") }}</v-btn
                >
                <v-btn
                  class="my-1 px-2 breadcrumb-button"
                  color="primary"
                  :ripple="false"
                  plain
                  small
                  max-width="100%"
                  :min-width="0"
                  >{{ $route.query.search }}</v-btn
                >
              </v-breadcrumbs>
              <v-breadcrumbs
                v-else
                class="pa-2 breadcrumbs"
                :items="breadcrumbsPath"
              >
                <template v-slot:divider>
                  <v-icon>mdi-chevron-right</v-icon>
                </template>
                <template v-slot:item="{ item }">
                  <v-btn
                    class="my-1 px-2 breadcrumb-button"
                    text
                    small
                    max-width="100%"
                    :min-width="0"
                    :to="{
                      path: `/files/${activeRepositoryID}${
                        item.path ? `/${item.path}` : ''
                      }`,
                      query: { pn: $route.query.pn },
                    }"
                    exact
                    exact-path
                    >{{ item.name }}</v-btn
                  >
                </template>
              </v-breadcrumbs>
              <v-divider></v-divider>
            </template>
            <template v-slot:[`item.name`]="{ item }">
              <v-icon v-if="item.type === 'folder'" color="amber lighten-2"
                >mdi-folder</v-icon
              >
              <v-icon v-else :color="item.name | iconColor">{{
                item.name | iconFormat
              }}</v-icon>
              <router-link
                v-if="item.type === 'folder'"
                class="ml-1 text--primary"
                :to="{
                  path: item.path
                    ? `/files/${activeRepositoryID}${
                        item.path === '/' ? '' : item.path
                      }/${encodeURIComponent(item.name)}`
                    : `${$route.path}/${encodeURIComponent(item.name)}`,
                  query: { pn: $route.query.pn },
                }"
              >
                <search-result :result="item.displayName || item.name" />
              </router-link>
              <span v-else class="clickable ml-1" @click.stop="itemClick(item)">
                <search-result :result="item.displayName || item.name" />
              </span>
            </template>
            <template v-slot:[`item.size`]="{ item }">
              {{ item.size | sizeFormat }}
            </template>
            <template v-slot:[`item.uploadTime`]="{ item }">
              <span style="width: 100px">{{
                item.uploadTime | formatTime
              }}</span>
            </template>
            <template v-slot:footer>
              <v-divider v-if="listPageCount > 0"></v-divider>
              <v-row v-if="listPageCount > 0" class="ma-0" align="center">
                <v-col
                  cols="12"
                  sm="6"
                  xs="6"
                  class="px-0 py-1 d-flex justify-center justify-sm-start"
                  style=""
                >
                  <v-pagination
                    v-if="listPageCount > 1"
                    v-model="listPage"
                    :length="listPageCount"
                    @input="
                      `${$event}` !== $route.query.page &&
                        $router.push({
                          path: $route.path,
                          query: Object.assign({}, $route.query, {
                            page: `${$event}`,
                          }),
                        })
                    "
                  ></v-pagination>
                </v-col>
                <v-col
                  cols="12"
                  sm="6"
                  xs="6"
                  class="d-flex align-center justify-center justify-sm-end"
                >
                  <v-menu>
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn text small v-bind="attrs" v-on="on"
                        >{{ listPerPage === -1 ? $t("all") : listPerPage
                        }}<v-icon right>mdi-menu-down</v-icon></v-btn
                      >
                    </template>
                    <v-list>
                      <v-list-item
                        v-for="(item, index) in [
                          { text: '10', value: 10 },
                          { text: '50', value: 50 },
                          { text: '100', value: 100 },
                          { text: `${$t('all')}`, value: -1 },
                        ]"
                        :key="index"
                        @click="
                          $router.push({
                            path: $route.path,
                            query: Object.assign({}, $route.query, {
                              pn: `${item.value}`,
                              page: undefined,
                            }),
                          })
                        "
                      >
                        <v-list-item-title>{{ item.text }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                  <span class="text-caption ml-1"
                    >{{ $t("perPage") }} {{ displayList.length }}
                    {{ $t("unit") }}</span
                  >
                </v-col>
              </v-row>
            </template>
          </v-data-table>
          <v-menu
            v-model="rightClickMenu"
            :position-x="rightClickX"
            :position-y="rightClickY"
            absolute
            offset-x
          >
            <v-list dense>
              <v-list-item
                v-if="
                  selectedFiles.length === 1 &&
                  selectedFiles[0].type !== 'folder'
                "
                @click="itemClick(selectedFiles[0], true)"
              >
                <v-icon left>mdi-download</v-icon>
                <v-list-item-title>{{ $t("download") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :disabled="disableOperate" @click="moveAction()">
                <v-icon left>mdi-file-move</v-icon>
                <v-list-item-title>{{ $t("move") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :disabled="disableOperate" @click="removeAction()">
                <v-icon left>mdi-trash-can-outline</v-icon>
                <v-list-item-title>{{ $t("delete") }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="selectedFiles.length === 1"
                :disabled="disableOperate"
                @click="renameAction(selectedFiles[0])"
              >
                <v-icon left>mdi-rename-box</v-icon>
                <v-list-item-title>{{ $t("rename") }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="selectedFiles.some((item) => item.type === 'file')"
                @click="copyDownloadLinks()"
              >
                <v-icon left>mdi-link</v-icon>
                <v-list-item-title>{{
                  $t("copyDownloadLinks")
                }}</v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item @click="copyAria2DownloadText()">
                <v-icon left>mdi-download-box</v-icon>
                <v-list-item-title>{{
                  $t("copyAria2DownloadText")
                }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="sendToAria2()">
                <v-icon left>mdi-auto-download</v-icon>
                <v-list-item-title>{{ $t("sendToAria2") }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-sheet>
      </v-col>
    </v-row>
    <video-player
      :source="source"
      :tracks="tracks"
      :show.sync="showVideo"
      :active-repository="activeRepository"
      @alert="alert"
    />
    <image-viewer
      :active-repository="activeRepository"
      :name="clickedItemName"
      :display-list="displayList"
      :list-sort-by="listSortBy"
      :list-sort-desc="listSortDesc"
      :show.sync="showImage"
      @alert="alert"
      @login="login"
    />
    <v-dialog
      v-model="action"
      persistent
      scrollable
      :max-width="
        formValue.type === 'move' || formValue.type === 'recover' ? 600 : 400
      "
      :fullscreen="
        $vuetify.breakpoint.xs &&
        (formValue.type === 'move' || formValue.type === 'recover')
      "
    >
      <v-card>
        <v-card-title>
          <span>{{
            formValue.type === "rename"
              ? $t("rename")
              : formValue.type === "addFolder"
              ? $t("form.newFolder")
              : formValue.type === "move"
              ? $t("moveTo")
              : formValue.type === "remove"
              ? $t("delete")
              : formValue.type === "recover" && $t("recovery.title")
          }}</span>
          <v-spacer></v-spacer>
          <v-btn plain icon>
            <v-icon @click.stop="action = false">mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-subtitle v-if="formValue.type === 'recover'" class="mt-0">{{
          $t("recovery.manual.hint")
        }}</v-card-subtitle>
        <v-card-text class="py-0">
          <v-container class="px-0">
            <v-form ref="form" v-model="formValidation">
              <v-row v-if="formValue.type !== 'recover'" no-gutters>
                <v-col
                  v-if="['rename', 'addFolder'].includes(formValue.type)"
                  cols="12"
                >
                  <v-text-field
                    v-model="formValue.name"
                    outlined
                    dense
                    :rules="[
                      (v) => !!v || $t('require'),
                      (v) =>
                        formValue.type === 'addFolder'
                          ? !displayList.some((e) => e.name === v) ||
                            $t('duplicate')
                          : !(
                              renameItem.path
                                ? getPath(
                                    renameItem.path
                                      .split('/')
                                      .map((e) => decodeURIComponent(e))
                                      .slice(1)
                                  )
                                : displayList
                            ).some(
                              (e) => renameItem.id !== e.id && e.name === v
                            ) || $t('duplicate'),
                    ]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col
                  v-if="formValue.type === 'remove' && !formValue.loading"
                  cols="12"
                  style="height: 48px"
                >
                  <i18n path="form.delete.hint">
                    <span>
                      <span
                        v-if="removeCounts[0] > 0"
                        class="error--text font-weight-bold"
                        >{{ removeCounts[0] }} </span
                      >{{ $tc("form.delete.file", removeCounts[0])
                      }}<span v-if="removeCounts.every((e) => e > 0)">{{
                        $t("form.delete.and")
                      }}</span
                      ><span
                        v-if="removeCounts[1] > 0"
                        class="error--text font-weight-bold"
                        >{{ removeCounts[1] }} </span
                      >{{ $tc("form.delete.folder", removeCounts[1]) }}</span
                    >
                  </i18n>
                </v-col>
                <v-row
                  v-if="formValue.type === 'remove' && formValue.loading"
                  justify="center"
                  align="center"
                  no-gutters
                >
                  <v-progress-circular
                    indeterminate
                    size="48"
                    color="primary"
                  ></v-progress-circular>
                </v-row>
                <v-col
                  v-if="formValue.type === 'move'"
                  class="folder-tree"
                  cols="12"
                >
                  <v-treeview
                    dense
                    rounded
                    hoverable
                    activatable
                    :items="formValue.folderList"
                    :load-children="getFolderList"
                    item-children="files"
                    @update:active="formValue.selectedFolder = $event[0]"
                  >
                    <template v-slot:prepend="{ open }">
                      <v-icon color="amber lighten-2">
                        {{ open ? "mdi-folder-open" : "mdi-folder" }}
                      </v-icon>
                    </template>
                    <template v-slot:label="{ item }">
                      <div class="folder-tree-item" :title="item.name">
                        {{ item.name }}
                      </div>
                    </template>
                  </v-treeview>
                </v-col>
              </v-row>
              <v-row v-else>
                <v-col
                  v-for="(file, index) in formValue.lostFiles"
                  :key="file.id"
                  cols="12"
                  class="mx-0 pt-0"
                >
                  <v-badge color="transparent" bottom overlap bordered avatar>
                    <template v-slot:badge>
                      <v-btn
                        :color="`grey ${
                          $vuetify.theme.dark ? 'darken' : 'lighten'
                        }-3`"
                        fab
                        depressed
                        x-small
                        :width="20"
                        :height="20"
                        style="z-index: 1"
                        @click.stop="formValue.lostFiles.splice(index, 1)"
                      >
                        <v-icon x-small>mdi-close</v-icon>
                      </v-btn>
                    </template>
                    <v-sheet class="overflow-hidden" outlined rounded>
                      <v-list-item class="pa-0" link :ripple="false">
                        <v-row class="ma-0">
                          <v-col cols="8">
                            <v-text-field
                              v-model="file.name"
                              :rules="[(v) => !!v]"
                              outlined
                              dense
                              hide-details
                              required
                            >
                              <template v-slot:label
                                >{{ $t("filename")
                                }}<span class="red--text">*</span>
                              </template>
                            </v-text-field>
                          </v-col>
                          <v-col cols="4" class="pl-0">
                            <v-text-field
                              v-model="file.size"
                              :rules="[
                                (v) =>
                                  !!v &&
                                  Number.isInteger(Number(v)) &&
                                  Number(v) > 0,
                              ]"
                              suffix="B"
                              type="number"
                              outlined
                              dense
                              hide-details
                              required
                            >
                              <template v-slot:label
                                >{{ $t("fileSize")
                                }}<span class="red--text">*</span>
                              </template>
                            </v-text-field>
                          </v-col>
                          <v-col cols="12" class="pt-0">
                            <v-text-field
                              v-model="file.digest"
                              :rules="[
                                (v) =>
                                  !!v &&
                                  /^[A-Za-z0-9]+$/.test(v) &&
                                  v.length === 64,
                              ]"
                              prefix="sha256:"
                              outlined
                              dense
                              hide-details
                              required
                            >
                              <template v-slot:label
                                >Digest<span class="red--text">*</span>
                              </template>
                            </v-text-field>
                          </v-col>
                        </v-row>
                      </v-list-item>
                    </v-sheet>
                  </v-badge>
                </v-col>
                <v-col cols="12" class="mx-0 pt-0">
                  <v-sheet
                    class="overflow-hidden"
                    outlined
                    rounded
                    @click.stop="
                      formValue.lostFiles.push({
                        id: getID(),
                        name: '',
                        digest: '',
                        size: '',
                      })
                    "
                  >
                    <v-list-item link>
                      <v-list-item-content>
                        <v-icon large>mdi-plus</v-icon>
                      </v-list-item-content>
                    </v-list-item>
                  </v-sheet>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            depressed
            :disabled="
              disableOperate ||
              formValue.loading ||
              !formValidation ||
              (formValue.type === 'move' && !formValue.selectedFolder) ||
              (formValue.type === 'recover' && formValue.lostFiles.length === 0)
            "
            @click.stop="
              formValue.type === 'rename'
                ? rename()
                : formValue.type === 'addFolder'
                ? addFolder()
                : formValue.type === 'move'
                ? move()
                : formValue.type === 'remove'
                ? removeSelected()
                : formValue.type === 'recover' && ManualRecover()
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
  <v-row v-else-if="!state" class="fill-height pa-15" align="center" justify="center">
    <v-sheet
      class="d-flex justify-center align-center pa-3"
      height="100%"
      width="100%"
      min-height="100px"
      min-width="200px"
      rounded
      outlined
    >
      <v-btn depressed to="/repositories?type=add"
        ><v-icon left>mdi-plus</v-icon>{{ $t("repository.add") }}</v-btn
      >
    </v-sheet>
  </v-row>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Emit, Ref, Watch } from 'vue-property-decorator';
import { Route, NavigationGuardNext } from 'vue-router';
import VideoPlayer from '@/components/VideoPlayer.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import SearchResult from '@/components/SearchResult.vue';
import { Repository, FileItem, FolderList, Manifest, PathNode, VForm } from '@/utils/types';
import { sizeFormat, formatTime, iconFormat, iconColor } from '@/utils/filters';
import network from '@/utils/network';
import database from '@/utils/database';
import storage from '@/utils/storage';
import { getID } from '@/utils/id-generator';
import PromiseWorker from 'promise-worker';
import searchWorker from '@/utils/search.worker';
import formWorker from '@/utils/form.worker';

interface BreadcrumbsNode extends PathNode {
  disabled: boolean;
}

interface RowItem {
  isExpanded: boolean;
  isMobile: boolean;
  isSelected: boolean;
  item: FileItem;
}

interface LostFile {
  id: number;
  name: string;
  digest: string;
  size: string;
}

@Component({
  components: {
    VideoPlayer,
    ImageViewer,
    SearchResult
  },
  filters: {
    sizeFormat,
    formatTime,
    iconFormat,
    iconColor
  }
})

export default class Files extends Vue {
  @Ref() private readonly form!: VForm
  @Ref() private readonly video!: HTMLMediaElement
  @Ref() private readonly getFiles!: HTMLInputElement
  @Ref() private readonly getFolder!: HTMLInputElement

  @Emit()
  private loading(): void { return; }
  @Emit()
  private loaded(): void { return; }
  @Emit()
  private login(authenticateHeader?: string, fn?: Function): void { authenticateHeader; fn; }
  @Emit()
  private alert(text: string, type?: string, error?: Error): void { text; type; error; }
  @Emit()
  private upload(files: File[]): string[] {
    files;
    this.getFiles.value = '';
    this.getFolder.value = '';
    return this.currentPath.map(e => e.name);
  }

  @Prop(String) private readonly repository!: string
  @Prop(String) private readonly path!: string
  @Prop(String) private readonly page!: string
  @Prop(String) private readonly perPage!: string
  @Prop(Boolean) private readonly state!: boolean
  @PropSync('committing') private isCommitting!: boolean

  private showVideo = false
  private showImage = false
  private activeRepositoryID = 0
  private repositories: Repository[] = []
  private displayList: FileItem[] = []
  private dataLoading = false
  private source = { name: '', url: '' }
  private tracks: { name: string; url: string }[] = []
  private clickedItemName = ''
  private action = false
  private readonly defaultFormValue: {
    type: string; name: string; selectedFolder: string; loading: boolean;
    folderList: FolderList[];
    lostFiles: LostFile[];
  } = {
      type: '',
      name: '',
      selectedFolder: '',
      lostFiles: [],
      folderList: [],
      loading: false
    }
  private formValue = Object.assign({}, this.defaultFormValue)
  private formValidation = true
  private renameItem!: FileItem
  private removeItems: FileItem[] = []
  private removeCounts: number[] = []
  private listPage = 1
  private listPerPage = 10
  private listPageCount = 0
  private root: FileItem = { name: 'root', type: 'folder', files: [], id: 0 }
  private currentPath: PathNode[] = [{ name: `${this.$t('root')}`, path: '' }]
  private layers: Manifest[] = []
  private selectedFiles: FileItem[] = []
  private folderList: FolderList = { name: `${this.$t('root')}`, files: [], id: 'root', disabled: false }
  private moveItems: FileItem[] = []
  private listSortBy: string | string[] | undefined = ''
  private listSortDesc: boolean | boolean[] | undefined = false
  private searchText = ''
  private searchRecursive = false
  private rightClickMenu = false
  private rightClickX = 0
  private rightClickY = 0

  @Watch('activeRepositoryID')
  private async onActiveRepositoryIDChange(val: number): Promise<void> {
    if (val === 0) return;
    await storage.setValue('active', val);
  }
  @Watch('listPage')
  private onListPageChange(): void {
    this.$vuetify.goTo(0, {
      container: '#main-container',
      duration: 0,
    });
  }

  private get breadcrumbsPath(): BreadcrumbsNode[] {
    const breadcrumbs = this.currentPath.map(path => Object.assign({}, path, { disabled: false }));
    breadcrumbs[breadcrumbs.length - 1].disabled = true;
    return breadcrumbs;
  }
  private get activeRepository(): Repository | undefined {
    return this.repositories.find(e => e.id === this.activeRepositoryID);
  }
  private get disableOperate(): boolean {
    return !this.activeRepository?.useDatabase && this.isCommitting;
  }

  private created(): void {
    this.loading();
  }
  private async beforeRouteEnter(to: Route, from: Route, next: NavigationGuardNext): Promise<void> {
    /*@ts-ignore*/
    next(vm => vm.beforeRoute(to, from, true));
  }
  private async beforeRouteUpdate(to: Route, from: Route, next: NavigationGuardNext): Promise<void> {
    this.beforeRoute(to, from);
    next();
  }
  private async beforeRoute(to: Route, from: Route, isEnter = false): Promise<void> {
    this.dataLoading = true;
    let listChanged = true;
    const { repository } = to.params;
    const { pn: perPage, page, search, recursive } = to.query;
    const path = to.path.replace(/\/files\/\d+\/?/, '');
    if (from.path === to.path && from.query.search === search && from.query.recursive === recursive) listChanged = false;
    if (listChanged) this.displayList = [];
    if (isEnter) {
      this.repositories = await storage.getRepositories();
      if (this.repositories.length === 0) this.loaded();
    }
    if (!repository) {
      const activeID = await storage.getActiveID();
      if (!this.activeRepositoryID && activeID) {
        this.activeRepositoryID = activeID;
      }
      if (this.activeRepositoryID) {
        this.$router.replace({ name: 'Files', params: { repository: `${this.activeRepositoryID}` }, query: { pn: perPage } });
      }
      return;
    }
    else if (isEnter) {
      this.activeRepositoryID = Number(repository);
      await this.getConfig(true, false, true);
    }
    else if (repository !== from.params.repository) {
      this.activeRepositoryID = Number(repository);
      await this.getConfig(false, false, true);
    }
    if (path !== from.path.replace(/\/files\/\d+\/?/, '')) {
      const pathArray = path ? path.split('/') : [];
      this.currentPath.splice(1);
      this.currentPath.push(...pathArray.map((item, index) => ({ name: decodeURIComponent(item), path: pathArray.slice(0, index + 1).join('/') })));
    }
    if (search && search !== this.searchText) {
      this.searchText = `${search}`;
    }
    else if (!search && this.searchText !== '') {
      this.searchText = '';
    }
    if (recursive && (recursive === '1') !== this.searchRecursive) {
      this.searchRecursive = recursive === '1';
    }
    else if (!recursive && this.searchRecursive !== false) {
      this.searchRecursive = false;
    }
    if (listChanged) {
      await this.updateDisplayList();
      this.listSortBy = '';
      this.listSortDesc = false;
    }
    if (page && Number(page) !== this.listPage) {
      this.listPage = Math.min(Number(page), this.listPageCount);
    }
    else if (!page && this.listPage !== 1) {
      this.listPage = 1;
    }
    if (perPage && Number(perPage) !== this.listPerPage) {
      this.listPerPage = Number(perPage);
    }
    else if (!perPage && this.listPerPage !== 10) {
      this.listPerPage = 10;
    }
    this.selectedFiles = [];
    if (!listChanged) this.dataLoading = false;
  }
  public async updateDisplayList(): Promise<void> {
    const worker = new searchWorker();
    const promiseWorker = new PromiseWorker(worker);
    const list: FileItem[] | undefined = await promiseWorker.postMessage({
      list: this.root,
      path: this.currentPath.slice(1),
      searchText: this.searchText,
      searchRecursive: this.searchRecursive
    });
    worker.terminate();
    if (!list) this.alert(`${this.$t('pathNotExist')}`, 'error');
    this.displayList = list ?? [];
    this.dataLoading = false;
  }
  public async getConfig(holdPath = false, silent = false, routeUpdate = false): Promise<void> {
    try {
      if (!this.activeRepository) throw 'getRepositoryFailed';
      if (!silent) this.loading();
      const { config, layers } = await network.getManifests(this.activeRepository);
      this.layers = layers;
      this.root.files = config;
      if (!silent) this.selectedFiles = [];
      if (!holdPath) {
        this.currentPath.splice(1);
      }
      if (!routeUpdate) await this.updateDisplayList();
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.getConfig.bind(this));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    if (!silent) this.loaded();
  }

  private getID(): number {
    return getID();
  }
  private search(): void {
    if (this.searchText) {
      if (this.searchText === (this.$route.query.search) &&
        (this.searchRecursive ? '1' : '0') === (this.$route.query.recursive)
      ) return;
      this.$router.push({
        path: this.$route.path,
        query: Object.assign({}, {
          pn: this.$route.query.pn,
          search: this.searchText,
          recursive: this.searchRecursive ? '1' : '0'
        }),
      });
    }
    else {
      if (!this.$route.query.search) return;
      this.$router.push({
        path: this.$route.path,
        query: Object.assign({}, {
          pn: this.$route.query.pn
        }),
      });
    }
  }
  private addFolderAction(): void {
    this.resetForm({ type: 'addFolder' });
    this.action = true;
  }
  private async addFolder(): Promise<void> {
    try {
      this.action = false;
      if (!this.activeRepository) throw 'getRepositoryFailed';
      this.isCommitting = true;
      this.loading();
      const name = this.formValue.name;
      if (this.activeRepository.useDatabase) {
        if (!await database.check(this.activeRepository)) throw `${this.$t('database.notSynchronize')}`;
        await database.add(
          this.currentPath.slice(1).map(node => node.name),
          { name, type: 'folder', id: getID(), uploadTime: Date.now() },
          this.activeRepository
        );
        const config = await database.list(this.activeRepository);
        await network.commit(config, this.activeRepository);
        this.root.files = config;
        await this.updateDisplayList();
      }
      else {
        this.getPath(this.currentPath).push({ name, type: 'folder', files: [], id: getID(), uploadTime: Date.now() });
        await network.commit(this.root.files as FileItem[], this.activeRepository);
        await this.getConfig(true, true);
      }
      this.selectedFiles = [];
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
    this.isCommitting = false;
  }
  private async removeAction(removeItems = this.selectedFiles): Promise<void> {
    this.removeItems = removeItems;
    this.resetForm({ type: 'remove', loading: true });
    this.action = true;
    const worker = new formWorker();
    const promiseWorker = new PromiseWorker(worker);
    const { fileCount, folderCount } = await promiseWorker.postMessage({
      type: 'count',
      files: removeItems
    });
    worker.terminate();
    this.removeCounts = [fileCount, folderCount];
    this.formValue.loading = false;
  }
  private async removeSelected(): Promise<void> {
    try {
      this.action = false;
      if (!this.activeRepository) throw 'getRepositoryFailed';
      this.isCommitting = true;
      this.loading();
      if (this.activeRepository.useDatabase && !await database.check(this.activeRepository)) throw `${this.$t('database.notSynchronize')}`;
      try {
        await this.remove(this.removeItems, this.currentPath.map(e => e.name), this.activeRepository, this.root);
      }
      finally {
        if (this.activeRepository.useDatabase) {
          const config = await database.list(this.activeRepository);
          await network.commit(config, this.activeRepository);
          this.root.files = config;
          await this.updateDisplayList();
        }
        else {
          await network.commit(this.root.files as FileItem[], this.activeRepository);
          await this.getConfig(true, true);
        }
        this.selectedFiles = [];
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.removeSelected.bind(this, this.removeItems));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
    this.isCommitting = false;
  }
  private async remove(files: FileItem[], currentPath: string[], repository: Repository, root: FileItem): Promise<void> {
    const rootString = JSON.stringify(root);
    for (const file of files) {
      const path = file.path ? file.path.split('/').map(e => decodeURIComponent(e)) : currentPath;
      if (repository.useDatabase) {
        try {
          await database.remove(file._id as string, repository);
        }
        catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }
      const currentPathFiles = this.getPath(path, root);
      if (file.type === 'file') {
        const digest = file.digest as string;
        const isSingleRelative = rootString.split(`"digest":"${digest}"`).length === 2;
        try {
          if (isSingleRelative)
            await network.removeFile(digest, repository);
        }
        catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }
      else {
        await this.remove(file.files as FileItem[], [...path, file.name], repository, root);
      }
      const index = currentPathFiles.findIndex(e => e.id === file.id);
      if (index > -1) currentPathFiles.splice(index, 1);
    }
  }
  private renameAction(renameItem: FileItem): void {
    this.renameItem = renameItem;
    this.resetForm({ type: 'rename', name: this.renameItem.name });
    this.action = true;
  }
  private async rename(): Promise<void> {
    try {
      this.action = false;
      if (!this.activeRepository) throw 'getRepositoryFailed';
      this.isCommitting = true;
      this.loading();
      const name = this.formValue.name;
      const path = this.renameItem.path ? this.renameItem.path.split('/').map(e => decodeURIComponent(e)) : this.currentPath.map(e => e.name);
      if (this.activeRepository.useDatabase) {
        if (!await database.check(this.activeRepository)) throw `${this.$t('database.notSynchronize')}`;
        let parent;
        if (path.length === 1) parent = 'root';
        else parent = this.getPath(path.slice(0, -1)).find(e => e.name === path[path.length - 1])?.uuid;
        if (!parent) throw 'internalError';
        await database.rename(Object.assign({}, this.renameItem, { name }), parent, this.activeRepository);
        const config = await database.list(this.activeRepository);
        await network.commit(config, this.activeRepository);
        this.root.files = config;
        await this.updateDisplayList();
      }
      else {
        const renameItem = this.getPath(path).find(e => e.id === this.renameItem.id);
        if (renameItem) renameItem.name = name;
        else throw 'internalError';
        await network.commit(this.root.files as FileItem[], this.activeRepository);
        await this.getConfig(true, true);
      }
      this.selectedFiles = [];
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
    this.isCommitting = false;
  }
  private async moveAction(moveItems = this.selectedFiles): Promise<void> {
    this.resetForm({ type: 'move', folderList: [{ name: `${this.$t('root')}`, files: [], id: `${getID()}`, disabled: false }] });
    this.action = true;
    this.moveItems = moveItems;

  }
  private async getFolderList(item: FolderList): Promise<void> {
    const worker = new formWorker();
    const promiseWorker = new PromiseWorker(worker);
    const list: FolderList[] = await promiseWorker.postMessage({
      type: 'folderList',
      files: this.moveItems,
      root: this.root
    });
    worker.terminate();
    item.files = list;
  }
  private async move(): Promise<void> {
    try {
      this.action = false;
      if (!this.activeRepository) throw 'getRepositoryFailed';
      this.isCommitting = true;
      this.loading();
      const dPath = this.formValue.selectedFolder?.split('/').map(e => decodeURIComponent(e));
      if (this.activeRepository.useDatabase) {
        if (!await database.check(this.activeRepository)) throw `${this.$t('database.notSynchronize')}`;
        let dFolderId = 'root';
        const dFolder = dPath.pop();
        if (dFolder) dFolderId = this.getPath(dPath).find(file => file.name === dFolder)?.uuid ?? 'root';
        const failFiles = await database.move(this.moveItems, dFolderId, this.activeRepository);
        const config = await database.list(this.activeRepository);
        await network.commit(config, this.activeRepository);
        this.root.files = config;
        await this.updateDisplayList();
        failFiles.forEach(file => this.alert(`${this.$t('someFilenameConflict', [file.name])}`, 'error'));
      }
      else {
        const dFolder = this.getPath(dPath, this.root);
        const currentPath = this.currentPath.map(e => e.name);
        const failFiles: FileItem[] = [];
        this.moveItems.forEach(file => {
          const path = file.path ? file.path.split('/').map(e => decodeURIComponent(e)) : currentPath;
          if (dPath.length === path.length && dPath.slice(1).every((e, i) => e === path[i + 1])) return;
          const sFolder = this.getPath(path, this.root);
          const index = sFolder.findIndex(e => e.id === file.id);
          if (dFolder.some(e => e.name === file.name)) failFiles.push(file);
          else if (index > -1) dFolder.push(...sFolder.splice(index, 1));
        });
        await network.commit(this.root.files as FileItem[], this.activeRepository);
        await this.getConfig(true, true);
        failFiles.forEach(file => this.alert(`${this.$t('someFilenameConflict', [file.name])}`, 'error'));
      }
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.selectedFiles = [];
    this.loaded();
    this.isCommitting = false;
  }
  private recoveryAction(): void {
    this.resetForm({ type: 'recover' });
    this.action = true;
  }
  // private async recover(manualLayers?: Manifest[]): Promise<void> {
  //   try {
  //     this.action = false;
  //     if (!this.activeRepository) throw 'getRepositoryFailed';
  //     this.loading();
  //     const { config, layers } = await network.getManifests(this.activeRepository);
  //     const files = config;
  //     const worker = new formWorker();
  //     const promiseWorker = new PromiseWorker(worker);
  //     const lostFiles: Manifest[] = await promiseWorker.postMessage({
  //       type: 'lostFiles',
  //       files,
  //       layers: manualLayers ?? layers
  //     });
  //     worker.terminate();
  //     if (lostFiles.length > 0) {
  //       let lostFilesFolder = files.find(file => file.name === 'LOST_FILE');
  //       if (!lostFilesFolder) {
  //         lostFilesFolder = { name: 'LOST_FILE', type: 'folder', id: getID(), files: [], uploadTime: Date.now() };
  //         files.push(lostFilesFolder);
  //       }
  //       lostFilesFolder.files?.push(...lostFiles.map(file => ({
  //         name: file.digest,
  //         type: 'file',
  //         digest: file.digest,
  //         size: Number(file.size),
  //         uploadTime: Date.now(),
  //         id: getID()
  //       })));
  //       await network.commit(files, this.activeRepository);
  //       this.alert(`${this.$t('recovery.success', [lostFiles.length])}`, 'success');
  //     }
  //     else this.alert(`${this.$t('recovery.nothing')}`, 'warning');
  //   }
  //   catch (error) {
  //     if (error?.message === 'need login') this.login(error.authenticateHeader);
  //     else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
  //     else this.alert(`${this.$t('unknownError')}`, 'error', error);
  //   }
  //   this.loaded();
  // }
  private async ManualRecover(): Promise<void> {
    this.action = false;
    if (!this.activeRepository) return this.alert(`${this.$t('getRepositoryFailed')}`, 'error');
    this.loading();
    const validFiles = this.formValue.lostFiles;
    if (validFiles.length > 0) {
      const { config, layers } = await network.getManifests(this.activeRepository);
      const files = config;
      layers.push(...validFiles.map(file => ({
        mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip',
        digest: `sha256:${file.digest.toLowerCase()}`,
        size: Number(file.size)
      })));
      try {
        await network.commit(files, this.activeRepository, layers);
        if (this.activeRepository?.useDatabase) {
          for (const file of validFiles) {
            await database.add(['LOST_FILE'], {
              name: file.name,
              type: 'file',
              digest: `sha256:${file.digest.toLowerCase()}`,
              size: Number(file.size),
              uploadTime: Date.now(),
              id: getID()
            }, this.activeRepository);
          }
          const config = await database.list(this.activeRepository);
          await network.commit(config, this.activeRepository);
        }
        else {
          let lostFilesFolder = files.find(file => file.name === 'LOST_FILE');
          if (!lostFilesFolder) {
            lostFilesFolder = { name: 'LOST_FILE', type: 'folder', id: getID(), files: [], uploadTime: Date.now() };
            files.push(lostFilesFolder);
          }
          validFiles.forEach(file => {
            let conflictNameFile = lostFilesFolder?.files?.find(e => e.name === file.name);
            if (conflictNameFile) {
              let i = 0;
              let [, name, ext] = file.name.match(/(.*)(\.[^.]*)$/) ?? [];
              if (!name) {
                name = file.name;
                ext = '';
              }
              while (conflictNameFile) {
                if (conflictNameFile?.digest === `sha256:${file.digest.toLowerCase()}`) throw 'fileExisted';
                i++;
                conflictNameFile = lostFilesFolder?.files?.find(e => e.name === `${name} (${i})${ext}`);
              }
              file.name = `${name} (${i})${ext}`;
            }
            lostFilesFolder?.files?.push({
              name: file.name,
              type: 'file',
              digest: `sha256:${file.digest.toLowerCase()}`,
              size: Number(file.size),
              uploadTime: Date.now(),
              id: getID()
            });
          });
          await network.commit(files, this.activeRepository);
        }
        await this.getConfig(true, true);
        this.loaded();
        this.alert(`${this.$t('recovery.success', [validFiles.length])}`, 'success');
      }
      catch (error) {
        if (error.response?.status === 400) this.alert(`${this.$t('recovery.manual.error')}`, 'error');
        else if (error?.message === 'need login') this.login(error.authenticateHeader);
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}`, 'error', error);
        this.loaded();
      }
    }
    else {
      this.loaded();
      this.alert(`${this.$t('recovery.nothing')}`, 'warning');
    }
  }
  private async copyDownloadLinks(items = this.selectedFiles): Promise<void> {
    try {
      if (!this.activeRepository) throw 'getRepositoryFailed';
      this.loading();
      const downloadLinks: string[] = [];
      for (const item of items) {
        if (item.digest && item.type === 'file') downloadLinks.push(await network.getDownloadURL(item.digest, this.activeRepository));
      }
      await navigator.clipboard.writeText(downloadLinks.join('\r\n'));
      this.alert(`${this.$t('copyDownloadLinksResult', [downloadLinks.length])}`, 'success');
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.copyDownloadLinks.bind(this, items));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
  }
  private getPath(path: PathNode[] | string[], root = this.root): FileItem[] {
    let filePointer: FileItem = root;
    path.slice(1).forEach((pathNode: PathNode | string) => {
      const nextPointer = filePointer.files?.find(e => e.name === (typeof pathNode === 'string' ? pathNode : pathNode.name));
      if (nextPointer?.type === 'folder') filePointer = nextPointer;
      else {
        return (root ? root.files : this.root.files) as FileItem[];
      }
    });
    return filePointer.files ?? [];
  }
  private async itemClick(item: FileItem, forceDownload = false): Promise<void> {
    try {
      if (!this.activeRepository) throw 'getRepositoryFailed';
      if (!item.digest) throw 'internalError';
      this.loading();
      this.clickedItemName = item.name;
      if (forceDownload) {
        this.sendToBrowser(await network.getDownloadURL(item.digest, this.activeRepository), item.name);
      }
      else if (/\.(jpg|png|gif|bmp|webp|ico)$/.test(item.name.toLowerCase())) {
        this.loaded();
        this.showImage = true;
      }
      else if (/\.(mp4|mkv|avi)$/.test(item.name.toLowerCase())) {
        Object.assign(this.source, { name: item.name, url: await network.getDownloadURL(item.digest, this.activeRepository) });
        const subtitles = this.displayList.filter(e => e.name.includes(item.name.substr(0, item.name.length - 3)) && /.*\.(vtt|srt|ass|ssa)$/.test(e.name));
        this.tracks = [];
        for (const subtitle of subtitles) {
          this.tracks.push({ name: subtitle.name, url: subtitle.digest as string });
        }
        this.showVideo = true;
      }
      else this.sendToBrowser(await network.getDownloadURL(item.digest, this.activeRepository), item.name);
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.itemClick.bind(this, item, forceDownload));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
  }
  private resetForm(value?: {
    type: string; name?: string; selectedFolder?: string; loading?: boolean;
    lostFiles?: LostFile[]; folderList?: FolderList[];
  }): void {
    Object.assign(this.formValue, this.defaultFormValue, { lostFiles: [], folderList: [] }, value);
    this.form?.resetValidation();
  }
  private async sendToAria2(items = this.selectedFiles): Promise<void> {
    try {
      if (!this.activeRepository) throw 'getRepositoryFailed';
      const info = this.generateDownloadInfo(items, '');
      const { success, fail } = await network.sentToAria2(info, this.activeRepository);
      this.alert(`${this.$t('sendResult', [success, fail])}`);
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.sendToAria2.bind(this, items));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
  }
  private async copyAria2DownloadText(items = this.selectedFiles): Promise<void> {
    try {
      if (!this.activeRepository) throw 'getRepositoryFailed';
      this.loading();
      const info: { name: string; digest: string; link?: string }[] = this.generateDownloadInfo(items, '');
      for (const item of info) {
        item.link = await network.getDownloadURL(item.digest, this.activeRepository);
      }
      await navigator.clipboard.writeText(info.map(item => item.link ? `${item.link}\r\n  out=${item.name}` : '').join('\r\n'));
      this.alert(`${this.$t('copyAria2DownloadTextResult')}`, 'success');
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader, this.copyAria2DownloadText.bind(this, items));
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
  }
  private sendToBrowser(url: string, filename: string): void {
    chrome.downloads.download({ url, filename: filename.replace(/[\\/:*?"<>|]/g, '') });
    this.alert(`${this.$t('sendToBrowser')}`, 'success');
  }
  private generateDownloadInfo(items: FileItem[], path: string): { name: string; digest: string }[] {
    const result: { name: string; digest: string }[] = [];
    items.forEach(item => {
      if (item.type === 'file') result.push({ name: `${path}${item.name.replace(/[\\/*?:<>|"]/g, '')}`, digest: item.digest as string });
      else if (item.type === 'folder') result.push(...this.generateDownloadInfo(item.files as FileItem[], `${path}${item.name.replaceAll('/', '')}/`));
    });
    return result;
  }
  private showRightClickMenu(e: MouseEvent, row: RowItem): void {
    e.preventDefault();
    this.rightClickX = e.clientX;
    this.rightClickY = e.clientY;
    if (this.selectedFiles.every(file => file.id !== row.item.id)) this.selectedFiles = [row.item];
    this.rightClickMenu = true;
  }
  private async refresh(): Promise<void> {
    this.loading();
    try {
      if (this.activeRepository?.useDatabase) {
        const config = await database.list(this.activeRepository);
        await network.commit(config, this.activeRepository);
        this.root.files = config;
        await this.updateDisplayList();
      }
      else await this.getConfig();
    }
    catch (error) {
      if (error?.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}`, 'error', error);
    }
    this.loaded();
  }
}
</script>

<style scoped lang="scss">
.clickable {
  cursor: pointer;
}
.folder-tree {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
}
.folder-tree-item {
  text-overflow: ellipsis;
  overflow: hidden;
}
.breadcrumb-button::v-deep > span {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  text-transform: none;
}
.breadcrumbs::v-deep .v-breadcrumbs__divider {
  padding: 0 4px;
}
.no-active.v-btn--active::before {
  opacity: 0;
}
</style>