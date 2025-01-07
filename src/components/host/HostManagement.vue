<template>
  <el-container class="host-management">
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="sidebar-header">
        <el-button
          class="collapse-button"
          :icon="isCollapse ? 'Expand' : 'Fold'"
          @click="toggleCollapse"
        />
      </div>
      <el-menu
        :router="true"
        :default-active="activeMenu"
        class="host-menu"
        :collapse="isCollapse"
      >
        <el-menu-item index="containers" :route="{ name: 'containers', params: { id: hostId } }">
          <el-icon><Monitor /></el-icon>
          <template #title>容器管理</template>
        </el-menu-item>
        <el-menu-item index="images" :route="{ name: 'images', params: { id: hostId } }">
          <el-icon><Picture /></el-icon>
          <template #title>镜像管理</template>
        </el-menu-item>
        <el-menu-item index="volumes" :route="{ name: 'volumes', params: { id: hostId } }">
          <el-icon><Files /></el-icon>
          <template #title>数据卷</template>
        </el-menu-item>
        <el-menu-item index="networks" :route="{ name: 'networks', params: { id: hostId } }">
          <el-icon><Connection /></el-icon>
          <template #title>网络管理</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header height="60px" class="header">
        <div class="breadcrumb">
          <el-breadcrumb>
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ hostName }}</el-breadcrumb-item>
            <el-breadcrumb-item>{{ getMenuTitle(activeMenu) }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-actions">
          <el-tag
            :type="hostStatus === 'connected' ? 'success' : 'danger'"
            class="status-tag"
          >
            {{ hostStatus === 'connected' ? '已连接' : '未连接' }}
          </el-tag>
          <el-button
            type="primary"
            :icon="Refresh"
            circle
            @click="handleRefresh"
          />
          <el-button
            :type="hostStatus === 'connected' ? 'danger' : 'success'"
            :icon="hostStatus === 'connected' ? 'Disconnect' : 'Connection'"
            circle
            @click="handleToggleConnection"
          />
        </div>
      </el-header>

      <el-main>
        <router-view v-if="hostStatus === 'connected'" />
        <el-empty
          v-else
          description="主机未连接"
        >
          <el-button type="primary" @click="handleConnect">连接主机</el-button>
        </el-empty>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Monitor,
  Picture,
  Files,
  Connection,
  Refresh,
  Expand,
  Fold
} from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'

const route = useRoute()
const dockerStore = useDockerStore()
const hostId = computed(() => route.params.id as string)
const hostName = computed(() => dockerStore.selectedHost?.name || '')
const hostStatus = computed(() => dockerStore.selectedHost?.status || 'disconnected')
const activeMenu = computed(() => route.name as string)
const isCollapse = ref(false)

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
const toggleCollapse = () => {
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
  height: 100%;
}

.sidebar {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.3s;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.collapse-button {
  padding: 8px;
}

.host-menu {
  border-right: none;
}

.header {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.breadcrumb {
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-tag {
  margin-right: 8px;
}

:deep(.el-menu) {
  --el-menu-hover-bg-color: var(--el-color-primary-light-9);
}

:deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary-light-9);
}
</style> 