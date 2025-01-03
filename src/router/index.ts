import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../components/layout/MainLayout.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/hosts',
      children: [
        {
          path: 'hosts',
          name: 'hosts',
          component: () => import('../components/docker/HostList.vue')
        },
        {
          path: 'containers',
          name: 'containers',
          component: () => import('../components/docker/ContainerList.vue')
        }
      ]
    }
  ]
})

export default router 