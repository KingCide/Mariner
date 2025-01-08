<template>
  <v-layout class="host-management">
    <!-- 左侧导航栏 -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="isCollapse"
      permanent
      class="sidebar"
    >
      <v-list>
        <v-list-item
          v-for="item in menuItems"
          :key="item.name"
          :to="{ name: item.name, params: { id: hostId } }"
          :prepend-icon="item.icon"
          :title="item.title"
          :value="item.name"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- 主内容区域 -->
    <v-main class="main-content">
      <!-- 顶部工具栏 -->
      <v-app-bar flat class="app-bar">
        <v-btn
          icon
          @click="toggleDrawer"
        >
          <v-icon>{{ isCollapse ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
        </v-btn>

        <v-breadcrumbs :items="breadcrumbs" />

        <v-spacer />

        <v-chip
          :color="hostStatus === 'connected' ? 'success' : 'error'"
          class="status-tag"
        >
          {{ hostStatus === 'connected' ? '已连接' : '未连接' }}
        </v-chip>

        <v-btn
          icon
          color="primary"
          class="ml-2"
          @click="handleRefresh"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>

        <v-btn
          icon
          :color="hostStatus === 'connected' ? 'error' : 'success'"
          class="ml-2"
          @click="handleToggleConnection"
        >
          <v-icon>{{ hostStatus === 'connected' ? 'mdi-lan-disconnect' : 'mdi-lan-connect' }}</v-icon>
        </v-btn>
      </v-app-bar>

      <!-- 主要内容区域 -->
      <div class="content-wrapper">
        <template v-if="hostStatus === 'connected'">
          <router-view />
        </template>
        <template v-else>
          <v-row justify="center" align="center" style="height: 100%">
            <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
              <v-card flat class="pa-8">
                <v-icon size="64" color="error" class="mb-4">mdi-lan-disconnect</v-icon>
                <div class="text-h5 mb-4">主机未连接</div>
                <v-btn
                  color="primary"
                  prepend-icon="mdi-lan-connect"
                  @click="handleConnect"
                >
                  连接主机
                </v-btn>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </div>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDockerStore } from '../../stores/dockerStore'

const route = useRoute()
const dockerStore = useDockerStore()
const drawer = ref(true)
const isCollapse = ref(false)

const hostId = computed(() => route.params.id as string)
const hostName = computed(() => dockerStore.selectedHost?.name || '')
const hostStatus = computed(() => dockerStore.selectedHost?.status || 'disconnected')

// 菜单项配置
const menuItems = [
  { name: 'containers', title: '容器管理', icon: 'mdi-view-dashboard' },
  { name: 'images', title: '镜像管理', icon: 'mdi-image-multiple' },
  { name: 'volumes', title: '数据卷', icon: 'mdi-database' },
  { name: 'networks', title: '网络管理', icon: 'mdi-lan' }
]

// 面包屑导航
const breadcrumbs = computed(() => [
  { title: '首页', disabled: false,  to: { name: 'home' } },
  { title: hostName.value, disabled: true },
  { title: getMenuTitle(route.name as string), disabled: true }
])

// 获取菜单标题
const getMenuTitle = (menu: string) => {
  const menuMap: Record<string, string> = {
    containers: '容器管理',
    images: '镜像管理',
    volumes: '数据卷',
    networks: '网络管理'
  }
  return menuMap[menu] || ''
}

// 切换侧边栏
const toggleDrawer = () => {
  isCollapse.value = !isCollapse.value
}

// 刷新
const handleRefresh = () => {
  if (route.name === 'containers') {
    dockerStore.refreshContainers()
  } else if (route.name === 'images') {
    dockerStore.refreshImages()
  }
}

// 连接/断开连接
const handleToggleConnection = () => {
  if (hostStatus.value === 'connected') {
    dockerStore.disconnectHost(hostId.value)
  } else {
    handleConnect()
  }
}

// 连接主机
const handleConnect = () => {
  dockerStore.connectHost(hostId.value)
}
</script>

<style scoped>
.host-management {
  display: flex;
  height: 100%;
  
  .sidebar {
    flex: 0 0 auto;
    border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .app-bar {
      flex: 0 0 auto;
    }
    
    .content-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      
      /* 为内容底部添加额外空间 */
      & > * {
        margin-bottom: 16px;
        
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

.status-tag {
  margin-left: 12px;
}
</style> 