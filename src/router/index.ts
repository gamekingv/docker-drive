import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Files from '@/views/Files.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    redirect: '/files'
  },
  {
    path: '/files/:repository?/:path*',
    name: 'Files',
    component: Files
  },
  {
    path: '/repositories',
    name: 'Repositories',
    // eslint-disable-next-line
    component: () => import('@/views/Repositories.vue'),
    props: (route): { initialType: string } => ({ initialType: route.query.type as string })
  },
  {
    path: '/tasks',
    name: 'Tasks',
    // eslint-disable-next-line
    component: () => import('@/views/Tasks.vue')
  }
];

const router = new VueRouter({
  routes
});

export default router;
