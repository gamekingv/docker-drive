import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import { Ripple } from 'vuetify/lib/directives';
import Blur from './blur-directive';
import zhHans from 'vuetify/src/locale/zh-Hans';
import 'typeface-roboto/index.css';
import '@mdi/font/css/materialdesignicons.css';
import { buildAsExtension } from '@/build-type.json';

const language = buildAsExtension ? (chrome?.i18n?.getUILanguage() ?? navigator.language) : navigator.language;

Vue.use(Vuetify, {
  directives: {
    Ripple,
    Blur
  }
});

export default new Vuetify({
  theme: { dark: true },
  lang: {
    locales: { zhHans },
    current: language.toLowerCase().includes('zh') ? 'zhHans' : 'en',
  },
  icons: {
    iconfont: 'mdi',
  }
});