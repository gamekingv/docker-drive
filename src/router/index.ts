import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Files from '../views/Files.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Files',
    component: Files
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue')
  }
];

const router = new VueRouter({
  routes
});

export default router;
