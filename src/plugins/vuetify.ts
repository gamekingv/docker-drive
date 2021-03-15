import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import zhHans from 'vuetify/src/locale/zh-Hans';
import 'typeface-roboto/index.css';
import '@mdi/font/css/materialdesignicons.css';

Vue.use(Vuetify);

export default new Vuetify({
  theme: { dark: true },
  lang: {
    locales: { zhHans },
    current: chrome.i18n.getUILanguage().toLowerCase().includes('zh') ? 'zhHans' : 'en',
  },
  icons: {
    iconfont: 'mdi',
  }
});