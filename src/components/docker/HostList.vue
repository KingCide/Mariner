<template>
  <div class="host-list">
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
                {{ host.status }}
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
  }
}
</script>

<style scoped>
.host-list {
  padding: 16px;
}

.host-card {
  margin-bottom: 16px;
  transition: all 0.3s;
}

.host-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.host-card.active {
  border-color: var(--el-color-primary);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.host-name {
  margin: 0;
  flex: 1;
  margin-left: 10px;
  font-size: 16px;
}

.host-info {
  font-size: 14px;
}

.info-item {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
}

.info-item .label {
  color: #909399;
  width: 70px;
}

.info-item .value {
  flex: 1;
  word-break: break-all;
}

.add-host-card {
  height: 100%;
  min-height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.add-host-card:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.add-host-card .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.status-tag {
  min-width: 60px;
  text-align: center;
}
</style> 