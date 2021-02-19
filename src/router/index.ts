import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Files from '@/views/Files.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Files',
    component: Files
  },
  {
    path: '/repositories',
    name: 'Repositories',
    component: () => import('@/views/Repositories.vue'),
    props: (route): { initialType: string } => ({ initialType: route.query.type as string })
  }
];

const router = new VueRouter({
  routes
});

export default router;
