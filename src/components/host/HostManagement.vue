<template>
  <div class="host-management">
    <!-- 顶部工具栏卡片 -->
    <v-card class="top-bar-card" elevation="2" hover>
      <div class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          @click="toggleDrawer"
        >
          <v-icon>{{ isCollapse ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
        </v-btn>
        <v-breadcrumbs
          :items="breadcrumbs"
          class="pa-0 ml-2"
        >
          <template v-slot:divider>
            <v-icon>mdi-chevron-right</v-icon>
          </template>
        </v-breadcrumbs>
      </div>

      <div class="d-flex align-center gap-3">
        <v-chip
          :color="hostStatus === 'connected' ? 'success' : 'error'"
          :variant="hostStatus === 'connected' ? 'elevated' : 'outlined'"
          class="status-chip"
          size="small"
        >
          {{ hostStatus === 'connected' ? '已连接' : '未连接' }}
        </v-chip>

        <v-btn
          icon
          variant="text"
          @click="handleRefresh"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>

        <v-btn
          icon
          variant="text"
          @click="handleToggleConnection"
        >
          <v-icon>{{ hostStatus === 'connected' ? 'mdi-lan-disconnect' : 'mdi-lan-connect' }}</v-icon>
        </v-btn>
      </div>
    </v-card>

    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <!-- 左侧导航栏卡片 -->
      <v-card 
        class="nav-card"
        :class="{ 'nav-card-collapsed': isCollapse }"
        elevation="2"
        hover
      >
        <v-list class="pa-2">
          <v-list-item
            v-for="item in menuItems"
            :key="item.name"
            :to="{ name: item.name, params: { id: hostId } }"
            :prepend-icon="item.icon"
            :title="item.title"
            :value="item.name"
            rounded="lg"
            class="mb-2"
            :class="{ 'v-list-item--active': route.name === item.name }"
          >
            <template v-slot:prepend>
              <v-icon :icon="item.icon" :class="{ 'centered-icon': isCollapse }" />
            </template>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- 右侧内容卡片 -->
      <v-card class="content-card" elevation="2" hover>
        <template v-if="hostStatus === 'connected'">
          <router-view />
        </template>
        <template v-else>
          <v-row justify="center" align="center" style="height: 100%">
            <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
              <v-card class="pa-8" elevation="2">
                <v-icon size="64" color="error" class="mb-4">mdi-lan-disconnect</v-icon>
                <div class="text-h5 mb-4">主机未连接</div>
                <v-btn
                  color="primary"
                  prepend-icon="mdi-lan-connect"
                  @click="handleConnect"
                  rounded="lg"
                >
                  连接主机
                </v-btn>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.host-management {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
  background-color: rgb(var(--v-theme-background));
}

.top-bar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-radius: 12px !important;
  background-color: rgb(var(--v-theme-surface)) !important;
  transition: transform 0.2s ease-in-out;
}

.content-wrapper {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0; /* 防止内容溢出 */
}

.nav-card {
  width: 250px;
  border-radius: 12px !important;
  background-color: rgb(var(--v-theme-surface)) !important;
  transition: all 0.3s ease;
}

.nav-card-collapsed {
  width: 70px;
  
  :deep(.v-list-item-title) {
    display: none;
  }
}

.content-card {
  flex: 1;
  border-radius: 12px !important;
  background-color: rgb(var(--v-theme-surface)) !important;
  overflow: auto;
  transition: transform 0.2s ease-in-out;
}

.status-chip {
  min-width: 80px;
  justify-content: center;
}

:deep(.v-list-item--active) {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  
  .v-icon {
    color: rgb(var(--v-theme-on-primary));
  }
}

:deep(.v-list-item) {
  transition: all 0.3s ease;
  
  &:hover:not(.v-list-item--active) {
    background-color: rgba(var(--v-theme-primary), 0.1);
  }
}

:deep(.centered-icon) {
  margin-inline: auto;
}

/* 卡片悬停效果 */
:deep(.v-card--hover) {
  &:hover {
    transform: translateY(-2px);
  }
}
</style>

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
  { title: '首页', disabled: false, to: { name: 'home' } },
  { title: hostName.value || '本地Docker', disabled: true },
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