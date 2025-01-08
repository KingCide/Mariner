<template>
  <div class="containers">
    <!-- 工具栏 -->
    <v-row class="mb-4">
      <v-col cols="12" sm="auto">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="handleCreate"
        >
          创建容器
        </v-btn>
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field
          v-model="searchText"
          prepend-inner-icon="mdi-magnify"
          label="搜索容器"
          hide-details
          density="comfortable"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- 容器统计信息 -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <div>
              <div class="text-subtitle-2 text-medium-emphasis">总容器数</div>
              <div class="text-h4">{{ hostStats?.containers || 0 }}</div>
            </div>
            <v-spacer />
            <v-icon size="48" color="primary" class="opacity-50">mdi-docker</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <div>
              <div class="text-subtitle-2 text-medium-emphasis">运行中</div>
              <div class="text-h4">{{ runningContainers.length }}</div>
            </div>
            <v-spacer />
            <v-icon size="48" color="success" class="opacity-50">mdi-play-circle</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <div>
              <div class="text-subtitle-2 text-medium-emphasis">CPU 使用率</div>
              <div class="text-h4">{{ hostStats?.cpu || 0 }}%</div>
            </div>
            <v-spacer />
            <v-icon size="48" color="info" class="opacity-50">mdi-cpu-64-bit</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <div>
              <div class="text-subtitle-2 text-medium-emphasis">内存使用率</div>
              <div class="text-h4">{{ hostStats?.memory || 0 }}%</div>
            </div>
            <v-spacer />
            <v-icon size="48" color="warning" class="opacity-50">mdi-memory</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 容器列表 -->
    <v-card class="mb-4">
      <v-data-table
        :loading="loading"
        :headers="headers"
        :items="filteredContainers"
        :search="searchText"
        hover
      >
        <template v-slot:item.id="{ item }">
          <span class="text-caption text-medium-emphasis">{{ item.id.substring(0, 12) }}</span>
        </template>

        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
            label
          >
            {{ item.status }}
          </v-chip>
        </template>

        <template v-slot:item.ports="{ item }">
          <div v-for="port in getUniquePorts(item.ports)" :key="port.privatePort">
            {{ formatPort(port) }}
          </div>
        </template>

        <template v-slot:item.created="{ item }">
          {{ formatDate(item.created) }}
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn-group density="comfortable">
            <v-btn
              v-if="item.status === 'running'"
              color="warning"
              icon
              variant="text"
              @click="handleStop(item)"
            >
              <v-icon>mdi-stop</v-icon>
            </v-btn>
            <v-btn
              v-else
              color="success"
              icon
              variant="text"
              @click="handleStart(item)"
            >
              <v-icon>mdi-play</v-icon>
            </v-btn>
            <v-btn
              color="primary"
              icon
              variant="text"
              @click="handleStats(item)"
            >
              <v-icon>mdi-chart-bar</v-icon>
            </v-btn>
            <v-menu location="bottom end">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon
                  variant="text"
                  v-bind="props"
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list>
                <v-list-item
                  prepend-icon="mdi-refresh"
                  @click="handleRestart(item)"
                >
                  <v-list-item-title>重启</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-text"
                  @click="handleLogs(item)"
                >
                  <v-list-item-title>日志</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-information"
                  @click="handleInspect(item)"
                >
                  <v-list-item-title>详情</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-console"
                  @click="handleTerminal(item)"
                >
                  <v-list-item-title>终端</v-list-item-title>
                </v-list-item>
                <v-divider />
                <v-list-item
                  prepend-icon="mdi-delete"
                  color="error"
                  @click="handleDelete(item)"
                >
                  <v-list-item-title>删除</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-btn-group>
        </template>
      </v-data-table>
    </v-card>

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

    <!-- 全局消息提示 -->
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
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useRoute } from 'vue-router'
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
const dockerService = new DockerService()

// 状态
const loading = computed(() => dockerStore.loading)
const hostId = computed(() => route.params.id as string)
const containers = computed(() => dockerStore.containers || [])
const runningContainers = computed(() => dockerStore.runningContainers || [])
const hostStats = computed(() => dockerStore.hostStats[hostId.value] || { containers: 0, cpu: 0, memory: 0 })
const selectedContainerId = ref('')
const searchText = ref('')

// 表格配置
const headers = [
  { title: '容器ID', key: 'id', width: 120, align: 'start' },
  { title: '名称', key: 'name', align: 'start', sortable: true },
  { title: '镜像', key: 'image', align: 'start', sortable: true },
  { title: '状态', key: 'status', width: 100, align: 'start' },
  { title: '端口', key: 'ports', align: 'start' },
  { title: '创建时间', key: 'created', align: 'start', sortable: true },
  { title: '操作', key: 'actions', align: 'end', sortable: false }
] as const

// 过滤后的容器列表
const filteredContainers = computed(() => {
  if (!searchText.value) return containers.value
  const search = searchText.value.toLowerCase()
  return containers.value.filter(container => 
    container.name?.toLowerCase().includes(search) ||
    container.id?.toLowerCase().includes(search) ||
    container.image?.toLowerCase().includes(search)
  )
})

// 消息提示
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

const showMessage = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

// 状态样式
const getStatusColor = (status: string) => {
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
    if (!hostId.value) return
    await dockerStore.refreshContainers()
  } catch (error) {
    showMessage(`加载失败: ${(error as Error).message}`, 'error')
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  if (hostId.value) {
    if (dockerStore.selectedHostId !== hostId.value) {
      if (!dockerStore.isConnected) {
        try {
          await dockerStore.connectHost(hostId.value)
        } catch (error) {
          showMessage('连接主机失败，请返回主机列表重试', 'error')
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
  refreshInterval = setInterval(loadData, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// 组件引用
const createContainerDialogRef = ref()
const logsDialogRef = ref()
const statsDialogRef = ref()
const inspectDialogRef = ref()
const terminalDialogRef = ref()

// 处理容器操作
const handleCreate = () => {
  createContainerDialogRef.value?.open()
}

const handleStart = async (item: any) => {
  try {
    await dockerStore.startContainer(hostId.value, item.id)
    showMessage('容器已启动')
    await loadData()
  } catch (error) {
    showMessage(`启动失败: ${(error as Error).message}`, 'error')
  }
}

const handleStop = async (item: any) => {
  try {
    await dockerStore.stopContainer(hostId.value, item.id)
    showMessage('容器已停止')
    await loadData()
  } catch (error) {
    showMessage(`停止失败: ${(error as Error).message}`, 'error')
  }
}

const handleRestart = async (item: any) => {
  try {
    await dockerStore.restartContainer(hostId.value, item.id)
    showMessage('容器已重启')
    await loadData()
  } catch (error) {
    showMessage(`重启失败: ${(error as Error).message}`, 'error')
  }
}

const handleDelete = async (item: any) => {
  try {
    const confirm = await new Promise<boolean>((resolve) => {
      const dialog = window.confirm('确定要删除该容器吗？')
      resolve(dialog)
    })
    
    if (confirm) {
      await dockerStore.deleteContainer(hostId.value, item.id)
      showMessage('容器已删除')
      await loadData()
    }
  } catch (error) {
    showMessage(`删除失败: ${(error as Error).message}`, 'error')
  }
}

const handleLogs = (item: any) => {
  selectedContainerId.value = item.id
  logsDialogRef.value?.show()
}

const handleStats = (item: any) => {
  selectedContainerId.value = item.id
  statsDialogRef.value?.show()
}

const handleInspect = (item: any) => {
  selectedContainerId.value = item.id
  inspectDialogRef.value?.show()
}

const handleTerminal = (item: any) => {
  selectedContainerId.value = item.id
  terminalDialogRef.value?.show()
}
</script>

<style scoped>
.containers {
  height: 100%;
  
  /* 移除固定的底部内边距，改用 margin */
  & > *:not(:last-child) {
    margin-bottom: 16px;
  }
  
  /* 表格样式优化 */
  :deep(.v-data-table) {
    background: transparent;
    
    /* 隐藏表格的滚动条 */
    .v-table__wrapper::-webkit-scrollbar {
      width: 0;
      height: 0;
      background: transparent;
    }
  }
  
  :deep(.v-data-table-header) {
    background-color: rgb(var(--v-theme-surface));
  }
  
  :deep(.v-data-table__wrapper) {
    border-radius: 8px;
  }
}
</style> 