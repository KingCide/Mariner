<template>
  <div class="containers">
    <!-- 工具栏 -->
    <div class="toolbar d-flex align-center justify-space-between">
      <div class="d-flex align-center gap-2">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="handleCreate"
          rounded="lg"
        >
          创建容器
        </v-btn>
        <v-btn
          :color="showStats ? 'primary' : 'default'"
          :variant="showStats ? 'tonal' : 'outlined'"
          prepend-icon="mdi-chart-box"
          @click="showStats = !showStats"
          rounded="lg"
        >
          统计信息
        </v-btn>
        
        <!-- 批量操作按钮组移到这里 -->
        <v-btn-group v-if="selected.length > 0" rounded="lg">
          <v-btn
            prepend-icon="mdi-play"
            color="success"
            variant="tonal"
            @click="handleBatchOperation('start')"
            :disabled="!hasStoppedContainers"
          >
            启动
          </v-btn>
          <v-btn
            prepend-icon="mdi-stop"
            color="warning"
            variant="tonal"
            @click="handleBatchOperation('stop')"
            :disabled="!hasRunningContainers"
          >
            停止
          </v-btn>
          <v-btn
            prepend-icon="mdi-refresh"
            color="info"
            variant="tonal"
            @click="handleBatchOperation('restart')"
            :disabled="!hasRunningContainers"
          >
            重启
          </v-btn>
          <v-menu location="bottom">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                append-icon="mdi-chevron-down"
                variant="tonal"
              >
                更多操作
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                prepend-icon="mdi-flash"
                @click="handleBatchOperation('kill')"
                :disabled="!hasRunningContainers"
              >
                <v-list-item-title>强制停止</v-list-item-title>
              </v-list-item>
              <v-list-item
                prepend-icon="mdi-pause"
                @click="handleBatchOperation('pause')"
                :disabled="!hasRunningContainers"
              >
                <v-list-item-title>暂停</v-list-item-title>
              </v-list-item>
              <v-list-item
                prepend-icon="mdi-play-pause"
                @click="handleBatchOperation('unpause')"
                :disabled="!hasPausedContainers"
              >
                <v-list-item-title>恢复</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item
                prepend-icon="mdi-delete"
                color="error"
                @click="handleBatchOperation('remove')"
              >
                <v-list-item-title>删除</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-btn-group>
      </div>

      <v-text-field
        v-model="searchText"
        prepend-inner-icon="mdi-magnify"
        label="搜索容器"
        hide-details
        density="comfortable"
        variant="outlined"
        style="max-width: 300px"
        rounded="lg"
      />
    </div>

    <!-- 统计信息卡片 -->
    <transition name="fade">
      <v-row v-show="showStats" class="stats-row">
        <v-col cols="12" sm="6" md="3">
          <v-card elevation="2" hover class="stat-card">
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
          <v-card elevation="2" hover class="stat-card">
            <v-card-text class="d-flex align-center pa-4">
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
          <v-card elevation="2" hover class="stat-card">
            <v-card-text class="d-flex align-center pa-4">
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
          <v-card elevation="2" hover class="stat-card">
            <v-card-text class="d-flex align-center pa-4">
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
    </transition>

    <!-- 容器列表卡片 -->
    <v-card elevation="2" hover class="container-list-card flex-grow-1">
      <v-data-table
        :loading="loading"
        :headers="headers"
        :items="filteredContainers"
        :search="searchText"
        hover
        fixed-header
        height="100%"
      >
        <template v-slot:item.select="{ item }">
          <v-checkbox
            v-model="selected"
            :value="item.id"
            hide-details
            density="compact"
          />
        </template>

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

        <template v-slot:item.image="{ item }">
          <div class="image-name">{{ item.image }}</div>
        </template>

        <template v-slot:item.actions="{ item }">
          <div class="d-flex align-center gap-1 justify-end">
            <!-- 快捷操作图标 -->
            <v-tooltip location="top" text="日志">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-text"
                  size="small"
                  variant="text"
                  v-bind="props"
                  @click="handleLogs(item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip location="top" text="详情">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-information"
                  size="small"
                  variant="text"
                  v-bind="props"
                  @click="handleInspect(item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip location="top" text="统计">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-chart-bar"
                  size="small"
                  variant="text"
                  v-bind="props"
                  @click="handleStats(item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip location="top" text="终端">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-console"
                  size="small"
                  variant="text"
                  v-bind="props"
                  @click="handleTerminal(item)"
                />
              </template>
            </v-tooltip>

            <v-divider vertical class="mx-2" />

            <!-- 更多操作菜单 -->
            <v-menu location="bottom end">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-dots-vertical"
                  size="small"
                  variant="text"
                  v-bind="props"
                />
              </template>
              <v-list>
                <v-list-item
                  prepend-icon="mdi-export"
                  @click="handleExport(item)"
                >
                  <v-list-item-title>导出容器</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-content-save"
                  @click="handleCommit(item)"
                >
                  <v-list-item-title>提交为新镜像</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-rename-box"
                  @click="handleRename(item)"
                >
                  <v-list-item-title>重命名</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-cog"
                  @click="handleUpdate(item)"
                >
                  <v-list-item-title>更新配置</v-list-item-title>
                </v-list-item>
                <v-list-item
                  prepend-icon="mdi-file-sync"
                  @click="handleCopy(item)"
                >
                  <v-list-item-title>复制文件</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
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
import { DockerService } from '../../services/dockerClient'
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
  { 
    title: '', 
    key: 'select',
    width: 50,
    sortable: false,
    align: 'center'
  },
  { 
    title: '容器ID', 
    key: 'id', 
    width: 120, 
    align: 'start' 
  },
  { 
    title: '名称', 
    key: 'name', 
    align: 'start', 
    sortable: true, 
    width: 200 
  },
  { 
    title: '镜像', 
    key: 'image', 
    align: 'start', 
    sortable: true, 
    width: 250 
  },
  { 
    title: '状态', 
    key: 'status', 
    width: 100, 
    align: 'start' 
  },
  { 
    title: '端口', 
    key: 'ports', 
    align: 'start', 
    width: 150 
  },
  { 
    title: '创建时间', 
    key: 'created', 
    align: 'start', 
    sortable: true, 
    width: 180 
  },
  { 
    title: '操作', 
    key: 'actions', 
    align: 'end',
    sortable: false, 
    width: 200,
    class: 'text-end'
  }
] as const

// 添加选中容器的状态管理
const selected = ref<string[]>([])

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

// 添加显示控制变量
const showStats = ref(localStorage.getItem('showStats') !== 'false')

// 监听状态变化并保存到本地存储
watch(showStats, (value) => {
  localStorage.setItem('showStats', value.toString())
})

// 计算属性：容器状态
const hasRunningContainers = computed(() => {
  return selected.value.some(id => {
    const container = containers.value.find(c => c.id === id)
    return container?.status === 'running'
  })
})

const hasStoppedContainers = computed(() => {
  return selected.value.some(id => {
    const container = containers.value.find(c => c.id === id)
    return container?.status === 'exited'
  })
})

const hasPausedContainers = computed(() => {
  return selected.value.some(id => {
    const container = containers.value.find(c => c.id === id)
    return container?.status === 'paused'
  })
})

// 批量操作处理方法
const handleBatchOperation = async (operation: 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause' | 'remove') => {
  try {
    // 确认提示
    if (operation === 'remove') {
      const confirm = await new Promise<boolean>((resolve) => {
        const dialog = window.confirm(`确定要删除选中的 ${selected.value.length} 个容器吗？`)
        resolve(dialog)
      })
      if (!confirm) return
    }

    // 执行批量操作
    const result = await dockerStore.batchOperation(hostId.value, selected.value, operation)
    
    // 显示结果
    if (result.success.length > 0) {
      showMessage(`成功${getOperationName(operation)} ${result.success.length} 个容器`)
    }
    if (result.failed.length > 0) {
      showMessage(`${result.failed.length} 个容器${getOperationName(operation)}失败`, 'error')
    }

    // 刷新容器列表
    await loadData()
    
    // 如果是删除操作，清空选择
    if (operation === 'remove') {
      selected.value = []
    }
  } catch (error) {
    showMessage(`批量操作失败: ${(error as Error).message}`, 'error')
  }
}

// 获取操作名称
const getOperationName = (operation: string): string => {
  const operationMap: Record<string, string> = {
    start: '启动',
    stop: '停止',
    restart: '重启',
    kill: '强制停止',
    pause: '暂停',
    unpause: '恢复',
    remove: '删除'
  }
  return operationMap[operation] || operation
}

// 高级操作处理方法
const handleExport = async (item: any) => {
  try {
    // TODO: 实现导出容器功能
    showMessage('导出容器功能开发中')
  } catch (error) {
    showMessage(`导出失败: ${(error as Error).message}`, 'error')
  }
}

const handleCommit = async (item: any) => {
  try {
    // TODO: 实现提交为新镜像功能
    showMessage('提交为新镜像功能开发中')
  } catch (error) {
    showMessage(`提交失败: ${(error as Error).message}`, 'error')
  }
}

const handleRename = async (item: any) => {
  try {
    // TODO: 实现重命名功能
    showMessage('重命名功能开发中')
  } catch (error) {
    showMessage(`重命名失败: ${(error as Error).message}`, 'error')
  }
}

const handleUpdate = async (item: any) => {
  try {
    // TODO: 实现更新配置功能
    showMessage('更新配置功能开发中')
  } catch (error) {
    showMessage(`更新失败: ${(error as Error).message}`, 'error')
  }
}

const handleCopy = async (item: any) => {
  try {
    // TODO: 实现文件复制功能
    showMessage('文件复制功能开发中')
  } catch (error) {
    showMessage(`复制失败: ${(error as Error).message}`, 'error')
  }
}
</script>

<style scoped>
.containers {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.toolbar {
  padding: 8px;
  background-color: rgb(var(--v-theme-surface));
  border-radius: 12px;
}

.stat-card,
.container-list-card {
  border-radius: 12px !important;
  background-color: rgb(var(--v-theme-surface)) !important;
  transition: transform 0.2s ease-in-out;
}

.stats-row {
  margin: 0;
  flex: 0 0 auto; /* 不参与flex伸缩 */
}

.stat-card {
  height: 100%;
  max-height: 100px;
  min-height: 100px;
}

.container-list-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;  /* 占用所有剩余空间 */
  min-height: 0; /* 允许内容溢出时滚动 */
}

:deep(.v-card--hover) {
  &:hover {
    transform: translateY(-2px);
  }
}

:deep(.v-data-table) {
  background: transparent;
  height: 100%;
  
  .v-table__wrapper {
    border-radius: 12px;
    height: 100%;
    overflow: auto;
  } 

  .v-table {
    height: 100%;
  }
}

:deep(.v-data-table-header) {
  background-color: rgb(var(--v-theme-surface));
  position: sticky;
  top: 0;
  z-index: 1;
}

:deep(.v-btn) {
  text-transform: none;
}

:deep(.v-field) {
  border-radius: 12px !important;
  
  .v-field__outline__start {
    border-radius: 12px 0 0 12px !important;
  }
  
  .v-field__outline__end {
    border-radius: 0 12px 12px 0 !important;
  }
}
/* 自定义滚动条样式 */
:deep(.v-table__wrapper)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

:deep(.v-table__wrapper)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.v-table__wrapper)::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 4px;
  
  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.3);
  }
}

/* 添加过渡动画样式 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 添加按钮间距样式 */
.gap-2 {
  gap: 8px;
}

.image-name {
  word-break: break-word;
  white-space: normal;
  line-height: 1.2;
  max-width: 400px;
  min-width: 150px;
}
</style> 