<template>
  <el-dialog
    v-model="dialogVisible"
    title="容器统计信息"
    width="800px"
    destroy-on-close
  >
    <div v-loading="loading">
      <!-- CPU 使用率 -->
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>CPU 使用率</span>
          </div>
        </template>
        <el-progress
          type="dashboard"
          :percentage="Math.round(stats.cpu?.usage || 0)"
          :color="getCpuColor"
        >
          <template #default="{ percentage }">
            <span class="progress-value">{{ percentage }}%</span>
          </template>
        </el-progress>
      </el-card>

      <!-- 内存使用率 -->
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>内存使用率</span>
            <span class="memory-details">
              {{ formatBytes(stats.memory?.usage || 0) }} / {{ formatBytes(stats.memory?.limit || 0) }}
            </span>
          </div>
        </template>
        <el-progress
          type="dashboard"
          :percentage="Math.round(stats.memory?.percentage || 0)"
          :color="getMemoryColor"
        >
          <template #default="{ percentage }">
            <span class="progress-value">{{ percentage }}%</span>
          </template>
        </el-progress>
      </el-card>

      <!-- 网络 I/O -->
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>网络 I/O</span>
          </div>
        </template>
        <div class="network-stats">
          <div v-for="(stats, interface_) in stats.network" :key="interface_">
            <h4>{{ interface_ }}</h4>
            <div class="network-details">
              <div>
                <el-icon><upload /></el-icon>
                {{ formatBytes(stats.tx_bytes) }}/s
              </div>
              <div>
                <el-icon><download /></el-icon>
                {{ formatBytes(stats.rx_bytes) }}/s
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 块设备 I/O -->
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>块设备 I/O</span>
          </div>
        </template>
        <div class="io-stats">
          <div class="io-details">
            <div>
              <el-icon><reading /></el-icon>
              读取: {{ formatBytes(stats.blockIO?.read || 0) }}/s
            </div>
            <div>
              <el-icon><edit /></el-icon>
              写入: {{ formatBytes(stats.blockIO?.write || 0) }}/s
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useDockerStore } from '../../stores/dockerStore'
import { formatBytes } from '../../utils/format'
import { Upload, Download, Reading, Edit } from '@element-plus/icons-vue'

// Props
const props = defineProps<{
  containerId: string
}>()

// Store
const dockerStore = useDockerStore()

// State
const dialogVisible = ref(false)
const loading = ref(false)
const stats = ref<any>({
  cpu: { usage: 0 },
  memory: { usage: 0, limit: 0, percentage: 0 },
  network: {},
  blockIO: { read: 0, write: 0 }
})

// 自动刷新定时器
let refreshInterval: ReturnType<typeof setInterval> | null = null

// 颜色计算
const getCpuColor = (percentage: number) => {
  if (percentage < 60) return '#67C23A'
  if (percentage < 80) return '#E6A23C'
  return '#F56C6C'
}

const getMemoryColor = (percentage: number) => {
  if (percentage < 70) return '#67C23A'
  if (percentage < 85) return '#E6A23C'
  return '#F56C6C'
}

// 刷新统计信息
const refreshStats = async () => {
  if (!dialogVisible.value) return
  
  loading.value = true
  try {
    const hostId = dockerStore.activeHostId
    if (!hostId) return
    
    const newStats = await dockerStore.getContainerStats(hostId, props.containerId)
    stats.value = newStats
  } catch (error) {
    console.error('Failed to refresh stats:', error)
  } finally {
    loading.value = false
  }
}

// 显示对话框
const show = async () => {
  dialogVisible.value = true
  await refreshStats()
  // 每秒刷新一次
  refreshInterval = setInterval(refreshStats, 1000)
}

// 清理
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// 导出方法
defineExpose({
  show
})
</script>

<style scoped>
.stat-card {
  margin-bottom: 20px;
}

.stat-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-value {
  font-size: 20px;
  font-weight: bold;
}

.memory-details {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.network-stats {
  padding: 10px;
}

.network-details {
  display: flex;
  gap: 20px;
  margin-top: 10px;
}

.network-details div {
  display: flex;
  align-items: center;
  gap: 5px;
}

.io-stats {
  padding: 10px;
}

.io-details {
  display: flex;
  gap: 20px;
}

.io-details div {
  display: flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-progress__text) {
  font-size: 16px !important;
}
</style> 