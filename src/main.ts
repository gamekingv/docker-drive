import './class-component-hooks';
import Vue, { VNode } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import './main.css';
import i18n from './i18n';
import router from './router';
import manifest from '../extension/manifest.json';

Vue.config.productionTip = false;
Vue.prototype.$extensionVersion = manifest.version;

new Vue({
  vuetify,
  i18n,
  router,
  render: (h): VNode => h(App)
}).$mount('#app');
