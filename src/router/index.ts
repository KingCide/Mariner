import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import Welcome from '../views/Welcome.vue'
import HostList from '../components/docker/HostList.vue'
import HostManagement from '../components/host/HostManagement.vue'

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
              component: () => import("@/components/host/Containers.vue")
            },
            {
              path: 'images',
              name: 'images',
              component: () => import("@/components/host/Images.vue")
            },
            {
              path: 'volumes',
              name: 'volumes',
              component: () => import("@/components/host/Volumes.vue")
            },
            {
              path: 'networks',
              name: 'networks',
              component: () => import("@/components/host/Networks.vue")
            }
          ]
        }
      ]
    }
  ]
})

export default router 