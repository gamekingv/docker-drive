import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Files from '@/views/Files.vue';
import Repositories from '@/views/Repositories.vue';
import Tasks from '@/views/Tasks.vue';

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
    component: Repositories,
    props: (route): { initialType: string } => ({ initialType: route.query.type as string })
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: Tasks
  }
];

const router = new VueRouter({
  routes
});

export default router;
