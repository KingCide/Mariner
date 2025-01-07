<template>
  <div class="host-list">
    <template v-if="hosts.length === 0">
      <!-- 欢迎界面 -->
      <div class="welcome-container">
        <v-card class="welcome-content" elevation="0">
          <v-img
            :src="getImageUrl('logo.png')"
            class="welcome-logo mx-auto"
            width="170"
            height="160"
            cover
          ></v-img>
          <h1 class="welcome-title text-h3 font-weight-bold mt-6 gradient-text">Mariner</h1>
          <p class="welcome-subtitle text-subtitle-1 text-medium-emphasis mt-2">Docker 容器管理工具</p>
          <div class="welcome-actions mt-8">
            <v-btn
              color="primary"
              size="x-large"
              prepend-icon="mdi-plus"
              @click="handleAddHost"
              class="px-8"
            >
              添加主机
            </v-btn>
          </div>
        </v-card>
      </div>
    </template>

    <template v-else>
      <!-- 主机列表 -->
      <v-container fluid>
        <v-row>
          <v-col
            v-for="host in hosts"
            :key="host.id"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card
              :class="['host-card', { 'active': selectedHostId === host.id }]"
              @click="handleHostClick(host)"
              elevation="2"
              :ripple="true"
            >
              <v-card-title class="card-header">
                <span class="host-name">{{ host.name }}</span>
                <v-chip
                  :color="getStatusColor(host.status)"
                  size="small"
                  class="status-tag"
                >
                  {{ getStatusText(host.status) }}
                </v-chip>
                <v-menu location="bottom end">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      v-bind="props"
                      @click.stop
                    ></v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      v-for="action in hostActions"
                      :key="action.key"
                      :value="action.key"
                      @click="handleHostAction(action.key, host)"
                    >
                      <template v-slot:prepend>
                        <v-icon :icon="action.icon" size="small"></v-icon>
                      </template>
                      <v-list-item-title>{{ action.label }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-card-title>

              <v-card-text class="host-info">
                <div class="info-item">
                  <span class="label">类型：</span>
                  <span class="value">{{ getConnectionTypeLabel(host.connectionType) }}</span>
                </div>
                <div class="info-item" v-if="host.config.host">
                  <span class="label">地址：</span>
                  <span class="value">{{ host.config.host }}</span>
                </div>
                <div class="info-item" v-if="host.config.port">
                  <span class="label">端口：</span>
                  <span class="value">{{ host.config.port }}</span>
                </div>
                
                <!-- 添加连接后的系统信息 -->
                <template v-if="host.status === 'connected' && host.info">
                  <div class="info-item">
                    <span class="label">版本：</span>
                    <span class="value">{{ host.info.version }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">系统：</span>
                    <span class="value">{{ host.info.os }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">内核：</span>
                    <span class="value">{{ host.info.kernelVersion }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">CPU：</span>
                    <span class="value">{{ host.info.cpus }} 核</span>
                  </div>
                  <div class="info-item">
                    <span class="label">内存：</span>
                    <span class="value">{{ formatBytes(host.info.memory) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">容器数：</span>
                    <span class="value">{{ host.info.containers }}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">镜像数：</span>
                    <span class="value">{{ host.info.images }}</span>
                  </div>
                </template>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- 添加主机卡片 -->
          <v-col cols="12" sm="6" md="4" lg="3">
            <v-card
              class="add-host-card"
              elevation="0"
              @click="handleAddHost"
              :ripple="true"
            >
              <v-icon size="x-large" color="primary">mdi-plus</v-icon>
              <span class="text-primary">添加主机</span>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </template>

    <!-- 添加主机对话框 -->
    <add-host-dialog
      v-model="showAddHostDialog"
      @close="showAddHostDialog = false"
      @saved="handleHostAdded"
    />

    <!-- 消息提示 -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useDockerStore } from '../../stores/dockerStore'
import AddHostDialog from './AddHostDialog.vue'
import type { DockerHost } from '../../../types/docker'

const router = useRouter()
const dockerStore = useDockerStore()
const showAddHostDialog = ref(false)

const hosts = computed(() => dockerStore.hosts)
const selectedHostId = computed(() => dockerStore.selectedHostId)

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

const hostActions = [
  {
    key: 'connect',
    label: '连接',
    icon: 'mdi-lan-connect'
  },
  {
    key: 'edit',
    label: '编辑',
    icon: 'mdi-pencil'
  },
  {
    key: 'delete',
    label: '删除',
    icon: 'mdi-delete'
  }
]

const showMessage = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'disconnected':
      return 'error'
    default:
      return 'grey'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中'
    case 'disconnected':
      return '未连接'
    default:
      return status
  }
}

const getConnectionTypeLabel = (type: string) => {
  switch (type) {
    case 'local':
      return '本地'
    case 'tcp':
      return 'TCP'
    case 'ssh':
      return 'SSH'
    default:
      return type
  }
}

const handleAddHost = () => {
  showAddHostDialog.value = true
}

const handleHostAdded = () => {
  showAddHostDialog.value = false
  showMessage('添加主机成功')
}

const handleHostClick = async (host: DockerHost) => {
  try {
    await dockerStore.setSelectedHost(host.id)
    router.push({ name: 'containers', params: { id: host.id } })
  } catch (error) {
    showMessage(`操作失败: ${(error as Error).message}`, 'error')
  }
}

const handleHostAction = async (action: string, host: DockerHost) => {
  try {
    switch (action) {
      case 'connect':
        if (host.status === 'connected') {
          await dockerStore.disconnectHost(host.id)
          showMessage('已断开连接')
        } else {
          await dockerStore.connectHost(host.id)
          showMessage('连接成功')
          router.push({ name: 'containers', params: { id: host.id } })
        }
        break
      case 'edit':
        // TODO: 实现编辑功能
        break
      case 'delete':
        await dockerStore.removeHost(host.id)
        showMessage('删除成功')
        break
    }
  } catch (error) {
    showMessage(`操作失败: ${(error as Error).message}`, 'error')
  }
}

const getImageUrl = (name: string) => {
  return new URL(`../../assets/${name}`, import.meta.url).href
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return bytes + ' B'
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB'
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }
}
</script>

<style scoped lang="scss">
.host-list {
  height: 100%;
  padding: 20px;
  background-color: rgb(var(--v-theme-background));
  overflow-y: auto;
  box-sizing: border-box;
}

.welcome-container {
  position: fixed;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}

.welcome-content {
  text-align: center;
  padding: 48px;
  background: rgb(var(--v-theme-surface));
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  
  .welcome-logo {
    border-radius: 16px;
  }
  
  .welcome-title {
    margin-top: 24px;
  }
  
  .welcome-subtitle {
    margin-top: 8px;
    color: rgba(var(--v-theme-on-surface), 0.7);
  }
  
  .welcome-actions {
    margin-top: 32px;
  }
}

.host-card {
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
  }
  
  &.active {
    border: 2px solid rgb(var(--v-theme-primary));
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .host-name {
      flex: 1;
      font-weight: 600;
    }
  }

  .host-info {
    .info-item {
      display: flex;
      margin-bottom: 4px;
      
      .label {
        width: 70px;
        opacity: 0.7;
      }
      
      .value {
        flex: 1;
      }
    }
  }
}

.add-host-card {
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  gap: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.05);
  }
}

.gradient-text {
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary)) 0%,
    rgb(var(--v-theme-secondary)) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: inline-block;
}
</style> 