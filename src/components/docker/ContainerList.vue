<template>
  <div class="container-list">
    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索容器..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="actions">
        <el-button type="primary" @click="handleCreateContainer">
          <el-icon><Plus /></el-icon>
          创建容器
        </el-button>
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredContainers"
      style="width: 100%"
      row-key="id"
    >
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="names[0]" label="名称" min-width="200" />

      <el-table-column prop="image" label="镜像" min-width="200" />

      <el-table-column label="端口" min-width="150">
        <template #default="{ row }">
          <template v-if="row.ports && row.ports.length">
            <div v-for="port in row.ports" :key="port.privatePort">
              {{ port.publicPort }}:{{ port.privatePort }}/{{ port.type }}
            </div>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="资源使用" width="200">
        <template #default="{ row }">
          <template v-if="containerStats[row.id]">
            <div class="resource-usage">
              <div class="usage-item">
                <span class="label">CPU</span>
                <el-progress
                  :percentage="containerStats[row.id].cpu"
                  :stroke-width="4"
                  :show-text="false"
                />
                <span class="value">{{ containerStats[row.id].cpu }}%</span>
              </div>
              <div class="usage-item">
                <span class="label">内存</span>
                <el-progress
                  :percentage="containerStats[row.id].memory"
                  :stroke-width="4"
                  :show-text="false"
                />
                <span class="value">{{ containerStats[row.id].memory }}%</span>
              </div>
            </div>
          </template>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              v-if="row.status === 'running'"
              type="warning"
              size="small"
              @click="handleStopContainer(row)"
            >
              停止
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              @click="handleStartContainer(row)"
            >
              启动
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="handleRestartContainer(row)"
            >
              重启
            </el-button>
            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
              <el-button size="small">
                <el-icon><More /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logs">查看日志</el-dropdown-item>
                  <el-dropdown-item command="terminal">打开终端</el-dropdown-item>
                  <el-dropdown-item command="inspect">查看详情</el-dropdown-item>
                  <el-dropdown-item
                    command="delete"
                    divided
                    :disabled="row.status === 'running'"
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

    <!-- 创建容器对话框 -->
    <create-container-dialog
      ref="createContainerDialogRef"
      @created="handleRefresh"
    />

    <!-- 日志查看对话框 -->
    <container-logs-dialog
      ref="containerLogsDialogRef"
      :container-id="selectedContainerId"
    />

    <!-- 终端对话框 -->
    <container-terminal-dialog
      ref="containerTerminalDialogRef"
      :container-id="selectedContainerId"
    />

    <!-- 容器详情对话框 -->
    <container-inspect-dialog
      ref="containerInspectDialogRef"
      :container-id="selectedContainerId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Search, Plus, Refresh, More } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import CreateContainerDialog from './CreateContainerDialog.vue'
import ContainerLogsDialog from './ContainerLogsDialog.vue'
import ContainerTerminalDialog from './ContainerTerminalDialog.vue'
import ContainerInspectDialog from './ContainerInspectDialog.vue'
import type { Container } from '../../../types/docker'

const dockerStore = useDockerStore()
const loading = ref(false)
const searchQuery = ref('')
const selectedContainerId = ref('')

// 组件引用
const createContainerDialogRef = ref()
const containerLogsDialogRef = ref()
const containerTerminalDialogRef = ref()
const containerInspectDialogRef = ref()

// 计算属性
const containers = computed(() => dockerStore.containers)
const containerStats = computed(() => dockerStore.containerStats)
const filteredContainers = computed(() => {
  if (!searchQuery.value) return containers.value

  const query = searchQuery.value.toLowerCase()
  return containers.value.filter(container => {
    return (
      container.names.some(name => name.toLowerCase().includes(query)) ||
      container.image.toLowerCase().includes(query) ||
      container.id.toLowerCase().includes(query)
    )
  })
})

// 状态更新定时器
let statsTimer: number | null = null

onMounted(() => {
  handleRefresh()
  // 每10秒更新一次容器状态
  statsTimer = window.setInterval(refreshContainerStats, 10000)
})

onUnmounted(() => {
  if (statsTimer) {
    clearInterval(statsTimer)
  }
})

// 刷新容器列表
const handleRefresh = async () => {
  loading.value = true
  try {
    await dockerStore.refreshContainers()
    await refreshContainerStats()
  } catch (error) {
    ElMessage.error('刷新容器列表失败')
    console.error('Failed to refresh containers:', error)
  } finally {
    loading.value = false
  }
}

// 刷新容器状态
const refreshContainerStats = async () => {
  for (const container of containers.value) {
    if (container.status === 'running') {
      try {
        await dockerStore.refreshContainerStats(container.id)
      } catch (error) {
        console.error(`Failed to refresh stats for container ${container.id}:`, error)
      }
    }
  }
}

// 获取状态类型
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

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'running':
      return '运行中'
    case 'paused':
      return '已暂停'
    case 'exited':
      return '已停止'
    default:
      return status
  }
}

// 创建容器
const handleCreateContainer = () => {
  createContainerDialogRef.value?.open()
}

// 启动容器
const handleStartContainer = async (container: Container) => {
  try {
    await dockerStore.startContainer(container.id)
    ElMessage.success('容器已启动')
    await handleRefresh()
  } catch (error) {
    ElMessage.error('启动容器失败')
    console.error('Failed to start container:', error)
  }
}

// 停止容器
const handleStopContainer = async (container: Container) => {
  try {
    await dockerStore.stopContainer(container.id)
    ElMessage.success('容器已停止')
    await handleRefresh()
  } catch (error) {
    ElMessage.error('停止容器失败')
    console.error('Failed to stop container:', error)
  }
}

// 重启容器
const handleRestartContainer = async (container: Container) => {
  try {
    await dockerStore.restartContainer(container.id)
    ElMessage.success('容器已重启')
    await handleRefresh()
  } catch (error) {
    ElMessage.error('重启容器失败')
    console.error('Failed to restart container:', error)
  }
}

// 处理更多操作
const handleCommand = async (command: string, container: Container) => {
  selectedContainerId.value = container.id

  switch (command) {
    case 'logs':
      containerLogsDialogRef.value?.open()
      break
    case 'terminal':
      containerTerminalDialogRef.value?.open()
      break
    case 'inspect':
      containerInspectDialogRef.value?.open()
      break
    case 'delete':
      if (container.status === 'running') {
        ElMessage.warning('请先停止容器')
        return
      }

      ElMessageBox.confirm(
        '确定要删除这个容器吗？此操作不可恢复。',
        '删除容器',
        {
          type: 'warning',
        }
      )
        .then(async () => {
          try {
            await dockerStore.removeContainer(container.id)
            ElMessage.success('容器已删除')
            await handleRefresh()
          } catch (error) {
            ElMessage.error('删除容器失败')
            console.error('Failed to remove container:', error)
          }
        })
        .catch(() => {})
      break
  }
}
</script>

<style scoped>
.container-list {
  padding: 16px;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-input {
  width: 300px;
}

.actions {
  display: flex;
  gap: 8px;
}

.resource-usage {
  font-size: 12px;
}

.usage-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.usage-item:last-child {
  margin-bottom: 0;
}

.usage-item .label {
  width: 40px;
  color: #909399;
}

.usage-item :deep(.el-progress) {
  flex: 1;
  margin: 0 4px;
}

.usage-item .value {
  width: 40px;
  text-align: right;
}
</style> 