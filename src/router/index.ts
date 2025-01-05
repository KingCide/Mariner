import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import Welcome from '../views/Welcome.vue'
import HostList from '../components/docker/HostList.vue'
import HostManagement from '../views/host/HostManagement.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HostList
        },
        {
          path: 'host/:id',
          name: 'hostManagement',
          component: HostManagement,
          children: [
            {
              path: 'containers',
              name: 'containers',
              component: () => import("@/views/host/Containers.vue")
            },
            {
              path: 'images',
              name: 'images',
              component: () => import("@/views/host/Images.vue")
            },
            {
              path: 'volumes',
              name: 'volumes',
              component: () => import("@/views/host/Volumes.vue")
            },
            {
              path: 'networks',
              name: 'networks',
              component: () => import("@/views/host/Networks.vue")
            }
          ]
        }
      ]
    }
  ]
})

export default router 