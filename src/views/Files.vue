<template>
  <div id="files">
    <v-row>
      <v-col cols="12" sm="4" xs="3" class="py-0">
        <v-select
          v-model="activeRepositoryID"
          :items="repositories"
          item-text="name"
          label="Solo field"
          solo
          hide-details
          @change="switchRepository()"
        ></v-select>
      </v-col>
      <v-spacer></v-spacer>
      <v-col class="d-flex justify-end align-center">
        <div>
          {{ `${layers.length}${$t("statistics")}`
          }}{{
            layers.reduce((total, layer) => (total += layer.size), 0)
              | sizeFormat
          }}
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="pb-0">
        <v-breadcrumbs class="pl-0 pb-0" :items="currentPath">
          <template v-slot:item="{ item }">
            <v-breadcrumbs-item
              :disabled="item.disabled"
              :class="{ clickable: !item.disabled }"
              @click.stop="!item.disabled && pathClick(item.id)"
            >
              {{ item.name }}
            </v-breadcrumbs-item>
          </template>
        </v-breadcrumbs>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="pt-0">
        <v-btn class="my-1 mr-1" depressed color="primary" @click="upload()"
          ><v-icon left>mdi-upload</v-icon>{{ $t("upload") }}</v-btn
        >
        <v-btn class="ma-1" color="primary" outlined @click="addFolderAction()"
          ><v-icon left>mdi-folder</v-icon>{{ $t("newFolder") }}</v-btn
        >
        <v-menu v-if="selectedFiles.length > 0" offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              class="ma-1"
              color="primary"
              outlined
              v-bind="attrs"
              v-on="on"
              ><v-icon left>mdi-dots-horizontal</v-icon>{{ $t("more") }}</v-btn
            >
          </template>
          <v-list dense>
            <v-list-item-group active-class="button-active">
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
              <v-list-item @click="moveAction()">
                <v-icon left>mdi-file-move</v-icon>
                <v-list-item-title>{{ $t("move") }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="removeSelected()">
                <v-icon left>mdi-trash-can-outline</v-icon>
                <v-list-item-title>{{ $t("delete") }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                v-if="selectedFiles.length === 1"
                @click="renameAction(selectedFiles[0])"
              >
                <v-icon left>mdi-rename-box</v-icon>
                <v-list-item-title>{{ $t("rename") }}</v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>
    <v-data-table
      v-model="selectedFiles"
      class="grey darken-3"
      :headers="fileListHeader"
      :items="displayList"
      :items-per-page="10"
      item-key="name"
      show-select
    >
      <template v-slot:[`item.name`]="{ item }">
        <v-icon v-if="item.type === 'folder'">mdi-folder</v-icon>
        <v-icon v-else>{{ item.name | iconFormat }}</v-icon>
        <span class="clickable ml-1" @click.stop="itemClick(item)">
          {{ item.name }}
        </span>
      </template>
      <template v-slot:[`item.size`]="{ item }">
        {{ item.size | sizeFormat }}
      </template>
      <template v-slot:[`item.uploadTime`]="{ item }">
        {{ item.uploadTime | formatTime }}
      </template>
      <template v-slot:[`item.actions`]="{ item }">
        <v-btn
          v-if="item.type !== 'folder'"
          icon
          small
          @click.stop="itemClick(item, true)"
        >
          <v-icon small> mdi-download </v-icon>
        </v-btn>
        <v-menu offset-x>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on">
              <v-icon small>mdi-dots-horizontal</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item-group active-class="button-active">
              <v-list-item @click="moveAction([item])">
                <v-icon left>mdi-file-move</v-icon>
                <v-list-item-title>{{ $t("move") }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="removeSelected([item])">
                <v-icon left>mdi-trash-can-outline</v-icon>
                <v-list-item-title>{{ $t("delete") }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="renameAction(item)">
                <v-icon left>mdi-rename-box</v-icon>
                <v-list-item-title>{{ $t("rename") }}</v-list-item-title>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </v-menu>
      </template>
    </v-data-table>
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
              :default="index === 0"
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
    <v-dialog v-model="action" persistent scrollable :max-width="400">
      <v-card>
        <v-card-title>
          <span class="headline">{{
            actionType === "rename"
              ? $t("newName")
              : actionType === "addFolder"
              ? $t("newFolderName")
              : actionType === "move"
              ? $t("moveTo")
              : ""
          }}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-form ref="form" lazy-validation>
              <v-row>
                <v-col v-if="actionType === 'rename'" cols="12">
                  <v-text-field
                    v-model="newName"
                    :rules="[
                      (v) => !!v || $t('require'),
                      (v) =>
                        !displayList.some((e) => e.name === v) ||
                        $t('duplicate'),
                    ]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col v-if="actionType === 'addFolder'" cols="12">
                  <v-text-field
                    v-model="folderName"
                    :rules="[
                      (v) => !!v || $t('require'),
                      (v) =>
                        !displayList.some((e) => e.name === v) ||
                        $t('duplicate'),
                    ]"
                    required
                  ></v-text-field>
                </v-col>
                <v-col
                  v-if="actionType === 'move'"
                  class="folder-tree"
                  cols="12"
                >
                  <v-treeview
                    dense
                    rounded
                    hoverable
                    activatable
                    :items="[folderList]"
                    item-children="files"
                    @update:active="(e) => (selectedFolder = e)"
                  >
                    <template v-slot:prepend="{ open }">
                      <v-icon>
                        {{ open ? "mdi-folder-open" : "mdi-folder" }}
                      </v-icon>
                    </template>
                  </v-treeview>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue darken-1"
            :disabled="actionType === 'move' && selectedFolder.length === 0"
            @click.stop="
              form.validate() &&
                (actionType === 'rename'
                  ? rename()
                  : actionType === 'addFolder'
                  ? addFolder()
                  : actionType === 'move' && move())
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
import { Vue, Component, Prop, PropSync, Emit, Ref } from 'vue-property-decorator';
import { Repository, FileItem, Manifest, PathNode, VForm } from '@/utils/types';
import { sizeFormat, formatTime, iconFormat } from '@/utils/filters';
import network from '@/utils/network';
import { parse as ASSparser } from 'ass-compiler';

interface FolderList {
  name: string;
  files: FolderList[];
  id: symbol;
}


@Component({
  filters: {
    sizeFormat,
    formatTime,
    iconFormat
  }
})

export default class Files extends Vue {

  @Ref() private readonly form!: VForm
  @Ref() private readonly video!: HTMLMediaElement

  @Emit()
  private loading(): void { return; }
  @Emit()
  private loaded(): void { return; }
  @Emit()
  private login(authenticateHeader?: string, fn?: Function, arg?: string[]): void { ({ authenticateHeader, fn, arg }); }
  @Emit()
  private alert(text: string, type?: string): void { ({ text, type }); }
  @Emit()
  private upload(): PathNode[] { return this.currentPath; }

  @Prop(Array) private readonly repositories!: Repository[]
  @PropSync('active') private activeRepositoryID!: number

  private showVideo = false
  private videoURL = ''
  private videoTitle = ''
  private isVideoPlay = false
  private subtitles: { label: string; url: string }[] = []
  private result = ''
  private action = false
  private actionType = ''
  private renameItem!: FileItem
  private newName = ''
  private folderName = ''
  private root: FileItem = { name: 'root', type: 'folder', files: [], id: Symbol() }
  private currentPath: PathNode[] = [{ name: `${this.$t('root')}`, disabled: true, id: Symbol() }]
  private layers: Manifest[] = []
  private uploadFiles: File[] = []
  private selectedFiles: FileItem[] = []
  private folderList: FolderList = { name: `${this.$t('root')}`, files: [], id: Symbol() }
  private moveItems: FileItem[] = []
  private selectedFolder: symbol[] = []
  private readonly fileListHeader = [
    { text: this.$t('filename'), align: 'start', value: 'name' },
    { text: '', value: 'actions', sortable: false },
    { text: this.$t('fileSize'), value: 'size', sortable: false },
    { text: this.$t('fileUploadTime'), value: 'uploadTime' },
  ]

  private get displayList(): FileItem[] {
    return this.getPath(this.currentPath);
  }
  private get activeRepository(): Repository | undefined {
    return this.repositories.find(e => e.value === this.activeRepositoryID);
  }
  private created(): void {
    // const config = '{"files":[{"name":"新番","type":"folder","files":[{"name":"[桜都字幕组] 2021年01月合集","type":"folder","files":[{"name":"[桜都字幕组][GOLD BEAR]装煌聖姫イースフィア ～淫虐の洗脳改造～ 後編.chs.mp4","digest":"sha256:d2744be7c39d1d7f4be87a6f8596db8060122f6ae5524bad0680d7a37361d195","size":468191180,"type":"file","uploadTime":1613023430271},{"name":"[桜都字幕组][nur]背徳の境界 ～女教師のウラ側～.chs.mp4","digest":"sha256:3195a9ca7f84b63b7ecd8256124a74ade2c1cc35ea8f690048e8d5a5e33b7c7f","size":384584279,"type":"file","uploadTime":1613030194741},{"name":"[桜都字幕组][PoRO]White Blue ～白衣の往生際～.chs.mp4","digest":"sha256:676539ec3b02b812fc2df2c8764ae991450d3d48ae01dca87a36a73129db200c","size":402076633,"type":"file","uploadTime":1613031195140},{"name":"[桜都字幕组][Queen Bee]シコやかなるときもハメるときも 後編.chs.mp4","digest":"sha256:6f1d439625cf9515c9e3944d086d8d6033008b5ee6108390f16ff274da478048","size":323124269,"type":"file","uploadTime":1613358679177},{"name":"[桜都字幕组][あんてきぬすっ]OVA 向日葵ハ夜ニ咲ク.chs.mp4","digest":"sha256:5b02c693d8ea7dc89f41f84947c964fa5117a9f1cb2e10dd10b3e82bad3c2e28","size":236268913,"type":"file","uploadTime":1613371268292},{"name":"[桜都字幕组][あんてきぬすっ]OVA 紫陽花の散ル頃に.chs.mp4","digest":"sha256:f878d07774046470bfe0f78cc5462594415bb4e14eaadb218868ecac7abaef01","size":214669661,"type":"file","uploadTime":1613402500036},{"name":"[桜都字幕组][ピンクパイナップル]君が好き。THE ANIMATION 第1巻.chs.mp4","digest":"sha256:9c5d64dce386ce511b0080a8b09bb1976731bcd64f26cbef22d43785e3c5ca07","size":371319260,"type":"file","uploadTime":1613402633937},{"name":"[桜都字幕组][鈴木みら乃]自宅警備員2 第五話 性奴メイド 詩絵里 ～這いよる女体～.chs.mp4","digest":"sha256:0541a18861d145fcf8a936781252c5a061bd69827018a6b3b3a041140fe3098c","size":243996791,"type":"file","uploadTime":1613402901960}],"uploadTime":1613023235774},{"name":"[桜都字幕组] 家有女友 / Domestic na Kanojo","type":"folder","files":[{"name":"[Sakurato] Domestic na Kanojo [01][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:1f5e275ba826291dfbdfc1136a7ba47f56fe5cd2d438d35e0b0c4809336687da","size":390772444,"type":"file","uploadTime":1613438832348},{"name":"[Sakurato] Domestic na Kanojo [02][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:2d0691d533a992be15d34e943aaaf1b382c481820c3f40d9569eec9ce04a5756","size":313852710,"type":"file","uploadTime":1613438946292},{"name":"[Sakurato] Domestic na Kanojo [03][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:868d8cce75237a0a4305805cec2da92d64d95e1c35c2c9cdedc60696cc198fca","size":370683030,"type":"file","uploadTime":1613439082408},{"name":"[Sakurato] Domestic na Kanojo [04][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:d4258d77ce79a94e9cc4530bfde8951cb0f58eada9f368f5b4a1599e404a7bb7","size":378603056,"type":"file","uploadTime":1613439247537},{"name":"[Sakurato] Domestic na Kanojo [05][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:5e78e6e53b0cb3b48f882206fbdb3c0cbd11eba183baa07b33725edadd92b053","size":334837068,"type":"file","uploadTime":1613439393930},{"name":"[Sakurato] Domestic na Kanojo [06][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:e2fda6e118528b9f5f7fa5de15e342e525c496b3aa28527c20914badfd74a949","size":363272123,"type":"file","uploadTime":1613439551241},{"name":"[Sakurato] Domestic na Kanojo [07][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:0077e75a57a5b7935fdc0bcaa814e193a21af64dc31022ea77390010c2f9ff69","size":352834215,"type":"file","uploadTime":1613439707400},{"name":"[Sakurato] Domestic na Kanojo [08][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:0fb59f015aa715fb55de9bc83ee289f25e8aff6e3645608027237467b3ad4c8c","size":314980856,"type":"file","uploadTime":1613439845599},{"name":"[Sakurato] Domestic na Kanojo [09][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:da0a2f70f229713cbb908242951538ec55ffa20ad6bce92828f270415fc88c03","size":307935881,"type":"file","uploadTime":1613439978505},{"name":"[Sakurato] Domestic na Kanojo [10][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:1f27a03111d313cb38a91bf4ecaf8404d39889f5154e6016dc117c61b51d7999","size":298917277,"type":"file","uploadTime":1613440097376},{"name":"[Sakurato] Domestic na Kanojo [11][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:12a71396943456a69c8a690e314c14d0d0c428a9e5388b995e945a0e8f62d09c","size":443012805,"type":"file","uploadTime":1613440278769},{"name":"[Sakurato] Domestic na Kanojo [12][BDRip][AVC-8bit 1080p AAC][CHS&JPN].mp4","digest":"sha256:fb84c5561df89b45338852cac4cb95cf176d4c60fcdcb7ae792e7f3a6de65097","size":266943384,"type":"file","uploadTime":1613440394037}],"uploadTime":1613438587623},{"name":"[极影字幕社] 在世界尽头咏唱恋曲的少女YU-NO","type":"folder","files":[{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][25][BIG5][1080p][BDrip].mp4","digest":"sha256:f2721eecaafe0a14ac674a8a0a637ea3c3d54fd7cb16044838a1678294739828","size":1455199267,"type":"file","uploadTime":1613442487962},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][05][BIG5][1080p][BDrip].mp4","digest":"sha256:02c4fe998bb35dda3f9776f4358ea430c14331d31e30951a56a4bbe946848f50","size":1352632063,"type":"file","uploadTime":1613457779135},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][11][BIG5][1080p][BDrip].mp4","digest":"sha256:c2229b12b7f5ca60ef9281a8e82a8351f784d614be6cd830bc63b84a37e87e3a","size":1396860235,"type":"file","uploadTime":1613458298989},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][13][BIG5][1080p][BDrip].mp4","digest":"sha256:860e3f8aeb1782a76207b9e969a96cebc8b35e7d0f7b81b4402e59cb3ea85686","size":1436080886,"type":"file","uploadTime":1613458848095},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][20][BIG5][1080p][BDrip].mp4","digest":"sha256:9edf651d910bac0e5b8f4500cab1a147ca23723b091d71b79d3f5000069811aa","size":1373365525,"type":"file","uploadTime":1613459372558},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][22][BIG5][1080p][BDrip].mp4","digest":"sha256:c0333632294a57662c98fa6f88993ce462a62fbb395b57065d81e59c4f5e7b38","size":1352079947,"type":"file","uploadTime":1613459892359},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][26][BIG5][1080p][BDrip].mp4","digest":"sha256:780a84a6a9635c1674844489c4d10d45a46895ecce014ca340a25a47684e67cd","size":1475811650,"type":"file","uploadTime":1613460458576},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][01][BIG5][1080p][BDrip].mp4","digest":"sha256:b93e771528c6d39928223bc72590be9e3caba8114b44ec9c34b8e1a2fbe81241","size":1329793119,"type":"file","uploadTime":1613472261998},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][02][BIG5][1080p][BDrip].mp4","digest":"sha256:e7c716421a8da50a2eed40d503a28c5071a9c508661d65aff0f311cd9917c00f","size":1246695651,"type":"file","uploadTime":1613472706677},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][03][BIG5][1080p][BDrip].mp4","digest":"sha256:cee2135e15b2dbfd99a1ebdcb18416a9f0308f01431b98c8a9c60d0b98bea7b6","size":1118062204,"type":"file","uploadTime":1613473106633},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][04][BIG5][1080p][BDrip].mp4","digest":"sha256:0d4743e17f1eb176eeed6f201d8bc8179ee84ec3531e978945ad2fc92fe0443d","size":1149886300,"type":"file","uploadTime":1613473518434},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][06][BIG5][1080p][BDrip].mp4","digest":"sha256:a65c0ed790bb81de9ec285f7e56858ad4546fed4572eafeca6fd9379a36dc499","size":1192661660,"type":"file","uploadTime":1613473944817},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][07][BIG5][1080p][BDrip].mp4","digest":"sha256:3697b1005e337dd086ed7b7b5460428b64905216f20035f468357f27c330785d","size":1218511838,"type":"file","uploadTime":1613474381150},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][08][BIG5][1080p][BDrip].mp4","digest":"sha256:e3a78709bc67cb6f9fe99e7661862aceca0baef8f8471e3a1e3abb8cd7af8aa7","size":1173322672,"type":"file","uploadTime":1613474801678},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][09][BIG5][1080p][BDrip].mp4","digest":"sha256:d919e496d03137a8ac7ae91558814e536c87f69a6eb53798b070da4e4e0eab87","size":1151637775,"type":"file","uploadTime":1613475213469},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][10][BIG5][1080p][BDrip].mp4","digest":"sha256:749668bd26c83bbc73c2a9fbcc17c2843f69b5d25c8f6e2279b63d90a15bf95f","size":1036251697,"type":"file","uploadTime":1613475585260},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][12][BIG5][1080p][BDrip].mp4","digest":"sha256:dfb1cca1f713993e8363bbbfb8f678c71607a5de9fb2793da2a1152e1bb10b53","size":1204888857,"type":"file","uploadTime":1613476017067},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][14][BIG5][1080p][BDrip].mp4","digest":"sha256:971c58dc6e996f54f54a7f6634dfd2729e2d1fec53678d01cfa12072ae0c9054","size":1095181469,"type":"file","uploadTime":1613476409557},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][15][BIG5][1080p][BDrip].mp4","digest":"sha256:84c5864ded173d0ca1e180c37ae11463b08c6d1ff7b71cf336d5e227a57c3af5","size":1164223510,"type":"file","uploadTime":1613476827066},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][16][BIG5][1080p][BDrip].mp4","digest":"sha256:b02bb0c365f00133a9924e4a3599b99d50db12cc0e41b48b4773a199d39f7abe","size":778458867,"type":"file","uploadTime":1613477144569},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][17][BIG5][1080p][BDrip].mp4","digest":"sha256:3ddc50cf36695899e3fc4f12086fe5f18c1afcde05a128613d9411283b324907","size":982350052,"type":"file","uploadTime":1613477497252},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][18][BIG5][1080p][BDrip].mp4","digest":"sha256:a90433bff1c933ac1f5a21d802b5b0deb5388ebf7ebab8caab5e412545ccca0e","size":949963351,"type":"file","uploadTime":1613477837597},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][19][BIG5][1080p][BDrip].mp4","digest":"sha256:da32d916d09743a395460a15ff8b05407fdd5b182622cffdf9cc2cf67c5eb608","size":907319578,"type":"file","uploadTime":1613478166802},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][21][BIG5][1080p][BDrip].mp4","digest":"sha256:a40e3aa5c5f2977815b3c3a202e8738aa3148fd235f73899211f0c9f8994ad64","size":1302138134,"type":"file","uploadTime":1613478631489},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][23][BIG5][1080p][BDrip].mp4","digest":"sha256:9a886c2f892997c03676d6cd552399bd79f82bd6103072b768bac2731d9aef79","size":765428056,"type":"file","uploadTime":1613478907499},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][24][BIG5][1080p][BDrip].mp4","digest":"sha256:357d95030b7197487f0b0248836187655047853edd8a268c97cd8ddbb3398212","size":1287445658,"type":"file","uploadTime":1613479378713},{"name":"[JYFanSub][Kono_Yo_no_Hate_de_Koi_wo_Utau_Shoujo_YU-NO][26.5][BIG5][1080p][BDrip].mp4","digest":"sha256:b9768fee12f8d5bac96148e947ca8d04006974d40554631eeb1e5d3b4992bc0e","size":833984013,"type":"file","uploadTime":1613479677849}],"uploadTime":1613439690004}],"uploadTime":1613023230496}]}';
    // this.root.files = network.parseConfig(JSON.parse(config));
    this.getConfig();
  }
  public async getConfig(holdPath = false): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    this.loading();
    try {
      const { config, layers } = await network.getManifests(this.activeRepository);
      this.selectedFiles = [];
      this.layers = layers;
      this.root.files = network.parseConfig(config);
      if (!holdPath) {
        this.currentPath.splice(1);
        this.currentPath[0].disabled = true;
      }
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.getConfig);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private addFolderAction(): void {
    this.actionType = 'addFolder';
    this.action = true;
  }
  private async addFolder(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const name = this.folderName;
    this.closeForm();
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      this.getPath(this.currentPath, cache.root).push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
      await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
      this.displayList.push({ name: name, type: 'folder', files: [], id: Symbol(), uploadTime: Date.now() });
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private async removeSelected(removeItems = this.selectedFiles): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)), layers: JSON.parse(JSON.stringify(this.layers)) };
      try {
        await this.remove(removeItems, this.currentPath, this.activeRepository, cache.root, cache.layers);
      }
      finally {
        await network.commit({ files: cache.root.files, layers: cache.layers }, this.activeRepository);
        await this.getConfig(true);
      }
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader, this.removeSelected);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private async remove(files: FileItem[], path: PathNode[], repository: Repository, root: FileItem, layers: Manifest[]): Promise<void> {
    for (const file of files) {
      const currentPathFiles = this.getPath(path, root);
      if (file.type === 'file') {
        const digest = file.digest as string;
        try {
          await network.removeFile(digest, repository);
        }
        catch (e) {
          if (e.response?.status !== 404) throw e;
        }
        const layerIndex = layers.findIndex(e => e.digest === file.digest);
        if (typeof layerIndex === 'number') layers.splice(layerIndex, 1);
      }
      else {
        await this.remove(file.files as FileItem[], [...path, { name: file.name, disabled: false, id: Symbol() }], repository, root, layers);
      }
      const index = currentPathFiles.findIndex(e => e.name === file.name);
      if (typeof index === 'number') currentPathFiles.splice(index, 1);
    }
  }
  private renameAction(renameItem: FileItem): void {
    this.newName = renameItem.name;
    this.renameItem = renameItem;
    this.actionType = 'rename';
    this.action = true;
  }
  private async rename(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const name = this.newName;
    this.closeForm();
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      const renameItem = this.getPath(this.currentPath, cache.root).find(e => e.name === this.renameItem.name);
      if (renameItem) renameItem.name = name;
      else throw 'unknownError';
      await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
      this.renameItem.name = name;
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private moveAction(moveItems = this.selectedFiles): void {
    this.actionType = 'move';
    this.action = true;
    this.folderList.files = [];
    this.moveItems = moveItems;
    const filterFolder = (filterFiles: FolderList, rootFiles: FileItem): void => {
      for (const file of rootFiles.files as FileItem[]) {
        if (file.type === 'folder') {
          const filterFile = { name: file.name, files: [], id: Symbol() };
          if (filterFiles.files) filterFiles.files.push(filterFile);
          filterFolder(filterFile, file);
        }
      }
    };
    filterFolder(this.folderList, this.root);
  }
  private async move(): Promise<void> {
    if (!this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
    const getSelectedPath = (target: symbol, folderList: FolderList, path: PathNode[]): boolean => {
      path.push({ name: folderList.name, disabled: false, id: folderList.id });
      if (folderList.id === target || folderList.files.some(file => getSelectedPath(target, file, path))) return true;
      path.pop();
      return false;
    };
    const dPath: PathNode[] = [];
    getSelectedPath(this.selectedFolder[0], this.folderList, dPath);
    this.closeForm();
    if (dPath.length === this.currentPath.length && dPath.every((e, i) => e.name === this.currentPath[i].name)) return;
    this.loading();
    try {
      const cache = { root: JSON.parse(JSON.stringify(this.root)) };
      const dFolder = this.getPath(dPath, cache.root);
      const sFolder = this.getPath(this.currentPath, cache.root);
      const failFiles: FileItem[] = [];
      this.moveItems.forEach(file => {
        const index = sFolder.findIndex(e => e.name === file.name);
        if (dFolder.some(e => e.name === file.name)) failFiles.push(file);
        else if (typeof index === 'number') dFolder.push(...sFolder.splice(index, 1));
      });
      await network.commit({ files: cache.root.files, layers: this.layers }, this.activeRepository);
      this.getConfig(true);
      if (failFiles.length > 0) throw 'someFilenameConflict';
    }
    catch (error) {
      if (error.message === 'need login') this.login(error.authenticateHeader);
      else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
      else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
    }
    this.loaded();
  }
  private switchRepository(): void {
    this.$nextTick(() => {
      this.getConfig();
    });
  }
  private getPath(path: PathNode[], root?: FileItem): FileItem[] {
    let filePointer: FileItem = root ? root : this.root;
    path.slice(1).forEach(pathNode => {
      const nextPointer = filePointer.files?.find(e => e.name === pathNode.name);
      if (nextPointer?.type === 'folder') filePointer = nextPointer;
      else {
        return (root ? root.files : this.root.files) as FileItem[];
      }
    });
    return filePointer.files ?? [];
  }
  private async itemClick(item: FileItem, forceDownload = false): Promise<void> {
    if (item.type === 'file') {
      if (!item.digest || !this.activeRepository) return this.alert(`${this.$t('unknownError')}`, 'error');
      this.loading();
      try {
        const downloadURL = await network.getDownloadURL(item.digest, this.activeRepository);
        if (downloadURL) {
          if (item.name.match(/\.(mp4|mkv|avi)$/) && !forceDownload) {
            this.videoURL = downloadURL;
            this.videoTitle = item.name;
            const subtitles = this.displayList.filter(e => e.name.includes(item.name.substr(0, item.name.length - 3)) && /.*\.(vtt|srt|ass|ssa)$/.test(e.name));
            this.subtitles = [];
            const assToVttArray: { label: string; cues: VTTCue[] }[] = [];
            for (const subtitle of subtitles) {
              const label = subtitle.name.replace(item.name.substr(0, item.name.length - 3), '');
              let url = '';
              try {
                if (/\.vtt$/.test(subtitle.name)) {
                  url = await network.getDownloadURL(subtitle.digest as string, this.activeRepository);
                  this.subtitles.push({ label, url });
                }
                else if (/\.srt$/.test(subtitle.name)) {
                  const { data: srt }: { data: string } = await network.downloadFile(subtitle.digest as string, this.activeRepository);
                  const vtt = 'WEBVTT\r\n\r\n' + srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3} --> \d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2.$3');
                  url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
                  this.subtitles.push({ label, url });
                }
                else if (/\.(ass|ssa)$/.test(subtitle.name)) {
                  const { data: assString }: { data: string } = await network.downloadFile(subtitle.digest as string, this.activeRepository);
                  const ass = ASSparser(assString);
                  const assToVtt = { label, cues: [] as VTTCue[] };
                  ass.events.dialogue.forEach(dialogue => dialogue.Text.combined !== '' && assToVtt.cues.push(new VTTCue(dialogue.Start, dialogue.End, dialogue.Text.combined)));
                  assToVttArray.push(assToVtt);
                }
              }
              catch (error) {
                this.alert(`${this.$t('loadSubtitleFailed')}${subtitle.name}`, 'warning');
              }
            }
            this.showVideo = true;
            this.$nextTick(() => assToVttArray.forEach((e, i) => {
              const track = this.video.addTextTrack('subtitles', e.label);
              if (this.subtitles.length === 0 && i === 0) track.mode = 'showing';
              e.cues.forEach(cue => track.addCue(cue));
            }));
          }
          else {
            chrome.downloads.download({ url: downloadURL, filename: item.name });
          }
        }
        else this.alert(`${this.$t('getDownloadURLFailed')}`, 'error');
      }
      catch (error) {
        if (error.message === 'need login') this.login(error.authenticateHeader);
        else if (typeof error === 'string') this.alert(`${this.$t(error)}`, 'error');
        else this.alert(`${this.$t('unknownError')}${error.toString()}`, 'error');
      }
      this.loaded();
    }
    else {
      this.currentPath[this.currentPath.length - 1].disabled = false;
      this.currentPath.push({ name: item.name, disabled: true, id: Symbol() });
    }
  }
  private pathClick(id: symbol): void {
    this.selectedFiles = [];
    const currentIndex = this.currentPath.findIndex(e => e.id === id);
    if (typeof currentIndex === 'number') {
      this.currentPath.splice(currentIndex + 1);
      this.currentPath[this.currentPath.length - 1].disabled = true;
    }
  }
  private closeForm(): void {
    this.form.reset();
    this.form.resetValidation();
    this.selectedFolder = [];
    this.action = false;
    this.actionType = '';
  }
  private videoEventHandler(e: Event): void {
    if (e.type === 'play') this.isVideoPlay = true;
    else this.isVideoPlay = false;
  }
}
</script>

<style scope lang="scss">
.clickable {
  cursor: pointer;
}
.video {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  display: flex;
}
.video > video::cue {
  background-color: rgba(0, 0, 0, 0.4);
}
.video-overlay {
  background-image: linear-gradient(black, transparent 25%);
  pointer-events: none;
  align-items: unset;
  justify-content: unset;
}
.folder-tree {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
}
.button-active:before {
  background-color: transparent !important;
}
</style>

<style lang="scss">
.video-container {
  overflow: hidden;
  background-color: black;
  display: flex;
}
</style>