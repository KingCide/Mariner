<template>
  <div class="host-list">
    <!-- 欢迎界面 -->
    <div v-if="hosts.length === 0" class="welcome-container">
      <div class="welcome-content">
        <img src="../../assets/logo2.jpg" alt="Logo" class="welcome-logo" />
        <h1 class="welcome-title">Mariner</h1>
        <p class="welcome-subtitle">Docker 容器管理工具</p>
        
        <div class="welcome-actions">
          <el-button
            type="primary"
            size="large"
            class="action-button"
            @click="handleAddHost"
          >
            <el-icon class="button-icon"><Plus /></el-icon>
            添加主机
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主机列表 -->
    <template v-else>
      <el-row :gutter="16">
        <el-col v-for="host in hosts" :key="host.id" :span="8">
          <el-card class="host-card" :class="{ active: host.id === selectedHostId }" @dblclick="handleHostClick(host)">
            <template #header>
              <div class="card-header">
                <el-tag
                  :type="getStatusType(host.status)"
                  class="status-tag"
                  size="small"
                >
                  {{ getStatusText(host.status) }}
                </el-tag>
                <h3 class="host-name">{{ host.name }}</h3>
                <el-dropdown trigger="click" @command="handleCommand($event, host)">
                  <el-button type="text">
                    <el-icon><More /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="connect">
                        {{ host.status === 'connected' ? '断开连接' : '连接' }}
                      </el-dropdown-item>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>

            <div class="host-info">
              <div class="info-item">
                <span class="label">地址：</span>
                <span class="value">
                  {{ host.connectionType === 'local' ? '本地' : `${host.config.host}:${host.config.port}` }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">类型：</span>
                <span class="value">{{ getConnectionType(host.connectionType) }}</span>
              </div>
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
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <div
            class="add-host-card"
            @click="handleAddHost"
          >
            <el-icon><Plus /></el-icon>
            <span>添加主机</span>
          </div>
        </el-col>
      </el-row>
    </template>

    <add-host-dialog
      ref="addHostDialogRef"
      :edit-host="editingHost"
      @saved="handleHostSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { More, Plus } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import { formatBytes } from '../../utils/format'
import AddHostDialog from './AddHostDialog.vue'
import type { DockerHost } from '../../../types/docker'
import { useRouter } from 'vue-router'

const dockerStore = useDockerStore()
const addHostDialogRef = ref()
const editingHost = ref<DockerHost | null>(null)
const router = useRouter()

const hosts = computed(() => dockerStore.hosts)
const selectedHostId = computed(() => dockerStore.selectedHostId)

const getStatusType = (status: string) => {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'disconnected':
      return 'info'
    case 'error':
      return 'danger'
    default:
      return 'info'
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
    case 'error':
      return '错误'
    default:
      return status
  }
}

const getConnectionType = (type: string) => {
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

const handleCommand = async (command: string, host: DockerHost) => {
  try {
    switch (command) {
      case 'connect':
        if (host.status === 'connected') {
          await dockerStore.disconnectHost(host.id)
        } else {
          await dockerStore.connectHost(host.id)
          router.push({ name: 'containers', params: { id: host.id } })
        }
        break
        
      case 'edit':
        editingHost.value = host
        addHostDialogRef.value?.open()
        break
        
      case 'delete':
        ElMessageBox.confirm(
          '确定要删除这个主机吗？这将断开所有连接。',
          '删除主机',
          {
            type: 'warning',
          }
        )
          .then(async () => {
            await dockerStore.removeHost(host.id)
            ElMessage.success('主机已删除')
          })
          .catch(() => {})
        break
    }
  } catch (error) {
    ElMessage.error(`操作失败: ${(error as Error).message}`)
  }
}

const handleAddHost = () => {
  editingHost.value = null
  addHostDialogRef.value?.open()
}

const handleHostSaved = () => {
  editingHost.value = null
}

const handleHostClick = (host: DockerHost) => {
  if (host.status === 'connected') {
    router.push({ name: 'containers', params: { id: host.id } })
  } else {
    handleCommand('connect', host)
  }
}
</script>

<style lang="scss">
@use '../../styles/theme.scss' as *;

.host-list {
  height: 100%;
  padding: var(--spacing-lg);
  background-color: var(--background-default);
  overflow-y: auto;
  box-sizing: border-box;
}

/* 欢迎界面样式 */
.welcome-container {
  height: 100%;
  @include flex-center;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-dark) 100%);
  
  .welcome-content {
    text-align: center;
    padding: var(--spacing-xl);
    background: var(--background-paper);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    max-width: 480px;
    width: 100%;
    
    .welcome-logo {
      width: 120px;
      height: 120px;
      margin-bottom: var(--spacing-lg);
    }
    
    .welcome-title {
      @include gradient-text;
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: var(--spacing-xs);
    }
    
    .welcome-subtitle {
      color: var(--text-secondary);
      font-size: 1.2rem;
      margin-bottom: var(--spacing-xl);
    }
    
    .welcome-actions {
      .action-button {
        background: var(--primary-main);
        border: none;
        padding: 12px 36px;
        font-size: 1.1rem;
        border-radius: 8px;
        
        &:hover {
          background: var(--primary-light);
        }
        
        .button-icon {
          margin-right: var(--spacing-xs);
        }
      }
    }
  }
}

/* 主机列表样式 */
.el-row {
  margin-bottom: var(--spacing-lg);
}

.host-card {
  @include card-hover;
  border: none;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
  
  .el-card__header {
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--background-paper);
    border-bottom: 1px solid var(--border-color);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    
    .host-name {
      flex: 1;
      margin: 0;
      color: var(--text-primary);
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .status-tag {
      border-radius: 4px;
      padding: 4px 8px;
    }
  }
  
  .host-info {
    padding: var(--spacing-md) var(--spacing-lg);
    
    .info-item {
      display: flex;
      margin-bottom: var(--spacing-xs);
      
      .label {
        color: var(--text-hint);
        width: 70px;
      }
      
      .value {
        color: var(--text-primary);
        flex: 1;
      }
    }
  }
  
  &.active {
    border: 2px solid var(--primary-main);
  }
}

.add-host-card {
  @include card-hover;
  @include flex-center;
  flex-direction: column;
  height: 200px;
  background: var(--background-paper);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  gap: var(--spacing-sm);
  color: var(--text-hint);
  
  &:hover {
    border-color: var(--primary-main);
    color: var(--primary-main);
  }
  
  .el-icon {
    font-size: 2rem;
  }
  
  span {
    font-size: 1.1rem;
  }
}

// 下拉菜单样式
.el-dropdown-menu {
  border: none;
  box-shadow: var(--card-shadow);
  border-radius: 8px;
  
  .el-dropdown-menu__item {
    padding: var(--spacing-sm) var(--spacing-lg);
    
    &:hover {
      background-color: var(--secondary-light);
      color: var(--primary-main);
    }
  }
}
</style> 