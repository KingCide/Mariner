<template>
  <div class="host-list">
    <el-row :gutter="16">
      <el-col v-for="host in hosts" :key="host.id" :span="8">
        <el-card class="host-card" :class="{ active: host.id === activeHostId }" @dblclick="handleHostClick(host)">
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
              <span class="value">{{ host.config.host }}:{{ host.config.port }}</span>
            </div>
            <div class="info-item">
              <span class="label">类型：</span>
              <span class="value">{{ getConnectionType(host.connectionType) }}</span>
            </div>
            <template v-if="host.status === 'connected'">
              <div class="info-item">
                <span class="label">容器数：</span>
                <span class="value">{{ hostStats[host.id]?.containers || 0 }}</span>
              </div>
              <div class="info-item">
                <span class="label">镜像数：</span>
                <span class="value">{{ hostStats[host.id]?.images || 0 }}</span>
              </div>
              <div class="resource-usage">
                <div class="usage-item">
                  <span class="label">CPU</span>
                  <el-progress
                    :percentage="hostStats[host.id]?.cpu || 0"
                    :stroke-width="4"
                    :show-text="false"
                  />
                  <span class="value">{{ hostStats[host.id]?.cpu || 0 }}%</span>
                </div>
                <div class="usage-item">
                  <span class="label">内存</span>
                  <el-progress
                    :percentage="hostStats[host.id]?.memory || 0"
                    :stroke-width="4"
                    :show-text="false"
                  />
                  <span class="value">{{ hostStats[host.id]?.memory || 0 }}%</span>
                </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { More, Plus } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import AddHostDialog from './AddHostDialog.vue'
import type { DockerHost } from '../../../types/docker'
import { useRouter } from 'vue-router'

const dockerStore = useDockerStore()
const addHostDialogRef = ref()
const editingHost = ref<DockerHost | null>(null)
const router = useRouter()

const hosts = computed(() => dockerStore.hosts)
const activeHostId = computed(() => dockerStore.activeHostId)
const hostStats = computed(() => dockerStore.hostStats)

// 自动刷新
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // 初始刷新
  hosts.value.forEach(host => refreshHostStats(host))
  // 每30秒刷新一次
  refreshInterval = setInterval(() => {
    hosts.value.forEach(host => refreshHostStats(host))
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

const refreshHostStats = async (host: DockerHost) => {
  if (host.status === 'connected') {
    try {
      await dockerStore.refreshContainers(host.id)
      await dockerStore.refreshImages(host.id)
    } catch (error) {
      console.error(`Failed to refresh stats for host ${host.id}:`, error)
    }
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'connected':
      return 'success'
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
  switch (command) {
    case 'connect':
      if (host.status === 'connected') {
        await dockerStore.disconnectHost(host.id)
      } else {
        await dockerStore.connectHost(host)
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
  margin-left: 8px;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-info {
  font-size: 14px;
}

.info-item {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.info-item .label {
  color: #909399;
  width: 70px;
}

.info-item .value {
  flex: 1;
}

.resource-usage {
  margin-top: 16px;
}

.usage-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.usage-item .label {
  width: 50px;
  color: #909399;
}

.usage-item :deep(.el-progress) {
  flex: 1;
  margin: 0 8px;
}

.usage-item .value {
  width: 45px;
  text-align: right;
}

.add-host-card {
  height: 193px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.add-host-card:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.add-host-card .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}
</style> 