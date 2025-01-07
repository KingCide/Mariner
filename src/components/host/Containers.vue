<template>
  <div class="containers">
    <div class="toolbar">
      <el-button type="primary" @click="handleCreate">
        创建容器
      </el-button>
      <el-input
        v-model="searchText"
        placeholder="搜索容器"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 容器统计信息 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>总容器数</span>
              </div>
            </template>
            <div class="card-value">{{ hostStats?.containers || 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>运行中</span>
              </div>
            </template>
            <div class="card-value">{{ runningContainers.length }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>CPU 使用率</span>
              </div>
            </template>
            <div class="card-value">{{ hostStats?.cpu || 0 }}%</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>内存使用率</span>
              </div>
            </template>
            <div class="card-value">{{ hostStats?.memory || 0 }}%</div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredContainers"
      style="width: 100%"
    >
      <el-table-column prop="id" label="容器ID" width="120">
        <template #default="{ row }">
          <el-text type="info">{{ row.id.substring(0, 12) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="name" label="名称" min-width="150">
        <template #default="{ row }">
          <el-text>{{ row.name }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="image" label="镜像" min-width="200" />

      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            :type="getStatusType(row.status)"
            size="small"
          >
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="ports" label="端口" min-width="150">
        <template #default="{ row }">
          <div v-for="port in getUniquePorts(row.ports)" :key="port.privatePort">
            {{ formatPort(port) }}
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="created" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              v-if="row.status === 'running'"
              type="warning"
              size="small"
              @click="handleStop(row)"
            >
              停止
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              @click="handleStart(row)"
            >
              启动
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="handleStats(row)"
            >
              统计
            </el-button>
            <el-dropdown>
              <el-button size="small">
                <el-icon><more /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleRestart(row)">
                    重启
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleLogs(row)">
                    日志
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleInspect(row)">
                    详情
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleTerminal(row)">
                    终端
                  </el-dropdown-item>
                  <el-dropdown-item
                    divided
                    @click="handleDelete(row)"
                  >
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 对话框组件 -->
    <create-container-dialog
      ref="createContainerDialogRef"
      :host-id="hostId"
    />
    <container-logs-dialog
      ref="logsDialogRef"
      :host-id="hostId"
      :container-id="selectedContainerId"
    />
    <container-stats-dialog
      ref="statsDialogRef"
      :container-id="selectedContainerId"
    />
    <container-inspect-dialog
      ref="inspectDialogRef"
      :container-id="selectedContainerId"
    />
    <container-terminal-dialog
      ref="terminalDialogRef"
      :container-id="selectedContainerId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  RefreshRight,
  More,
  Search
} from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import { DockerService } from '../../services/docker'
import CreateContainerDialog from '../../components/docker/CreateContainerDialog.vue'
import ContainerLogsDialog from '../../components/docker/ContainerLogsDialog.vue'
import ContainerStatsDialog from '../../components/docker/ContainerStatsDialog.vue'
import ContainerInspectDialog from '../../components/docker/ContainerInspectDialog.vue'
import ContainerTerminalDialog from '../../components/docker/ContainerTerminalDialog.vue'
import type { ContainerDetails } from '../../../types/docker'

const route = useRoute()
const dockerStore = useDockerStore()
const hostId = computed(() => route.params.id as string)
const loading = computed(() => dockerStore.loading)
const containers = computed(() => dockerStore.containers || [])
const runningContainers = computed(() => dockerStore.runningContainers || [])
const hostStats = computed(() => dockerStore.hostStats[hostId.value] || { containers: 0, cpu: 0, memory: 0 })

// 组件引用
const createContainerDialogRef = ref()
const logsDialogRef = ref()
const statsDialogRef = ref()
const inspectDialogRef = ref()
const terminalDialogRef = ref()

// 搜索
const searchText = ref('')
const filteredContainers = computed(() => {
  if (!searchText.value) return containers.value
  const search = searchText.value.toLowerCase()
  return containers.value.filter(container => 
    container.name?.toLowerCase().includes(search) ||
    container.id?.toLowerCase().includes(search) ||
    container.image?.toLowerCase().includes(search)
  )
})

// 状态样式
const getStatusType = (status: string) => {
  switch (status) {
    case 'running':
      return 'success'
    case 'paused':
      return 'warning'
    case 'exited':
      return 'info'
    default:
      return 'info'
  }
}

// 格式化端口
const formatPort = (port: { privatePort: number; publicPort?: number; type: string }) => {
  if (port.publicPort) {
    return `${port.publicPort}:${port.privatePort}/${port.type}`
  }
  return `${port.privatePort}/${port.type}`
}

// 获取去重后的端口列表
const getUniquePorts = (ports: Array<{ privatePort: number; publicPort?: number; type: string }>) => {
  const portMap = new Map<string, { privatePort: number; publicPort?: number; type: string }>()
  ports.forEach(port => {
    const key = `${port.publicPort || ''}-${port.privatePort}-${port.type}`
    if (!portMap.has(key)) {
      portMap.set(key, port)
    }
  })
  return Array.from(portMap.values())
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

// 监听路由参数变化
watch(() => route.params.id, async (newId) => {
  if (newId) {
    await loadData()
  }
})

// 加载数据
const loadData = async () => {
  try {
    if (!hostId.value) {
      console.log('hostId is empty')
      return
    }
    console.log('Loading containers for host:', hostId.value)
    console.log('Store state:', {
      selectedHostId: dockerStore.selectedHostId,
      isConnected: dockerStore.isConnected,
      containers: dockerStore.containers
    })
    
    // 添加 try-catch 来捕获具体的错误
    try {
      const result = await dockerService.listContainers(hostId.value)
      console.log('Raw API response:', result)
    } catch (apiError) {
      console.error('API call failed:', apiError)
    }
    
    await dockerStore.refreshContainers()
    console.log('Containers after refresh:', dockerStore.containers)
  } catch (error) {
    console.error('Failed to load containers:', error)
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  if (hostId.value) {
    // 确保选中的主机ID与路由参数一致
    if (dockerStore.selectedHostId !== hostId.value) {
      console.log('Syncing host ID:', hostId.value)
      // 如果主机未连接，先连接主机
      if (!dockerStore.isConnected) {
        try {
          await dockerStore.connectHost(hostId.value)
        } catch (error) {
          console.error('Failed to connect to host:', error)
          ElMessage.error('连接主机失败，请返回主机列表重试')
          return
        }
      }
    }
    await loadData()
  }
})

// 自动刷新
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // 每30秒自动刷新一次
  refreshInterval = setInterval(loadData, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// 处理容器操作
const handleCreate = () => {
  createContainerDialogRef.value?.open()
}

const handleStart = async (container: ContainerDetails) => {
  try {
    await dockerStore.startContainer(hostId.value, container.id)
    ElMessage.success('容器已启动')
    await loadData()
  } catch (error) {
    ElMessage.error(`启动失败: ${(error as Error).message}`)
  }
}

const handleStop = async (container: ContainerDetails) => {
  try {
    await dockerStore.stopContainer(hostId.value, container.id)
    ElMessage.success('容器已停止')
    await loadData()
  } catch (error) {
    ElMessage.error(`停止失败: ${(error as Error).message}`)
  }
}

const handleRestart = async (container: ContainerDetails) => {
  try {
    await dockerStore.restartContainer(hostId.value, container.id)
    ElMessage.success('容器已重启')
    await loadData()
  } catch (error) {
    ElMessage.error(`重启失败: ${(error as Error).message}`)
  }
}

const handleDelete = async (container: ContainerDetails) => {
  try {
    await ElMessageBox.confirm('确定要删除该容器吗？', '警告', {
      type: 'warning'
    })
    await dockerStore.deleteContainer(hostId.value, container.id)
    ElMessage.success('容器已删除')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${(error as Error).message}`)
    }
  }
}

// State
const selectedContainerId = ref('')

const handleLogs = (container: ContainerDetails) => {
  selectedContainerId.value = container.id
  logsDialogRef.value?.show()
}

const handleStats = (container: ContainerDetails) => {
  selectedContainerId.value = container.id
  statsDialogRef.value?.show()
}

const handleInspect = (container: ContainerDetails) => {
  selectedContainerId.value = container.id
  inspectDialogRef.value?.show()
}

const handleTerminal = (container: ContainerDetails) => {
  selectedContainerId.value = container.id
  terminalDialogRef.value?.show()
}

const dockerService = new DockerService()
</script>

<style scoped>
.containers {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

.stats-overview {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  text-align: center;
}
</style> 