<template>
  <el-container class="host-management">
    <el-aside width="200px">
      <el-menu
        :router="true"
        :default-active="activeMenu"
        class="host-menu"
      >
        <el-menu-item index="containers" :route="{ name: 'containers', params: { id: hostId } }">
          <el-icon><Monitor /></el-icon>
          <span>容器管理</span>
        </el-menu-item>
        <el-menu-item index="images" :route="{ name: 'images', params: { id: hostId } }">
          <el-icon><Picture /></el-icon>
          <span>镜像管理</span>
        </el-menu-item>
        <el-menu-item index="volumes" :route="{ name: 'volumes', params: { id: hostId } }">
          <el-icon><Files /></el-icon>
          <span>数据卷</span>
        </el-menu-item>
        <el-menu-item index="networks" :route="{ name: 'networks', params: { id: hostId } }">
          <el-icon><Connection /></el-icon>
          <span>网络管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header height="60px">
        <div class="header-content">
          <div class="host-info">
            <h2>{{ hostName }}</h2>
            <el-tag
              :type="hostStatus === 'connected' ? 'success' : 'danger'"
              size="small"
            >
              {{ hostStatus === 'connected' ? '已连接' : '未连接' }}
            </el-tag>
          </div>
          <div class="header-actions">
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, Picture, Files, Connection, Refresh } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import type { DockerHost } from '../../../types/docker'

const route = useRoute()
const router = useRouter()
const dockerStore = useDockerStore()

const hostId = computed(() => route.params.id as string)
const activeMenu = computed(() => route.name as string)

// 获取主机信息
const host = computed(() => dockerStore.hosts.find(h => h.id === hostId.value))
const hostName = computed(() => host.value?.name || '未知主机')
const hostStatus = computed(() => host.value?.status || 'disconnected')

// 监听主机状态变化
watch(hostStatus, (newStatus) => {
  if (newStatus === 'disconnected') {
    // 如果主机断开连接，跳转到容器页面（会显示未连接状态）
    router.push({ name: 'containers', params: { id: hostId.value } })
  }
})

// 页面加载时检查主机状态
onMounted(async () => {
  if (!host.value) {
    // 如果找不到主机，返回主机列表
    router.push({ name: 'hosts' })
    return
  }

  // 如果主机未连接，默认跳转到容器页面
  if (route.name === 'hostManagement') {
    router.push({ name: 'containers', params: { id: hostId.value } })
  }
})

// 刷新当前页面数据
const handleRefresh = async () => {
  if (route.name === 'containers') {
    await dockerStore.refreshContainers(hostId.value)
  } else if (route.name === 'images') {
    await dockerStore.refreshImages(hostId.value)
  }
  // TODO: 添加其他页面的刷新逻辑
}

// 连接/断开主机
const handleToggleConnection = async () => {
  if (!host.value) return

  try {
    if (hostStatus.value === 'connected') {
      await dockerStore.disconnectHost(hostId.value)
    } else {
      await dockerStore.connectHost(host.value)
    }
  } catch (error) {
    console.error('Failed to toggle connection:', error)
  }
}

const handleConnect = () => handleToggleConnection()
</script>

<style scoped>
.host-management {
  height: 100%;
}

.host-menu {
  height: 100%;
  border-right: none;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);
}

.host-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.host-info h2 {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.el-main {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}
</style> 