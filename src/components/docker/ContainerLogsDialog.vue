<template>
  <el-dialog
    v-model="visible"
    title="容器日志"
    width="800px"
    :close-on-click-modal="false"
    class="container-logs-dialog"
    @closed="handleClosed"
  >
    <div class="toolbar">
      <div class="filters">
        <el-checkbox v-model="follow" @change="handleFollowChange">
          实时更新
        </el-checkbox>
        <el-checkbox v-model="timestamps" @change="handleRefresh">
          显示时间戳
        </el-checkbox>
        <el-input-number
          v-model="tail"
          :min="10"
          :max="10000"
          :step="10"
          class="tail-input"
          @change="handleRefresh"
        />
        <span class="tail-label">行</span>
      </div>
      <div class="actions">
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="handleClear">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
        <el-button @click="handleCopy">
          <el-icon><CopyDocument /></el-icon>
          复制
        </el-button>
        <el-button @click="handleDownload">
          <el-icon><Download /></el-icon>
          下载
        </el-button>
      </div>
    </div>

    <div
      ref="logsContainerRef"
      class="logs-container"
      :class="{ following: follow }"
    >
      <div
        v-for="(line, index) in logs"
        :key="index"
        class="log-line"
        :class="getLogClass(line)"
      >
        {{ line }}
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Delete, CopyDocument, Download } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'

const props = defineProps<{
  containerId: string
}>()

const dockerStore = useDockerStore()
const visible = ref(false)
const follow = ref(false)
const timestamps = ref(false)
const tail = ref(1000)
const logs = ref<string[]>([])
const logsContainerRef = ref<HTMLElement>()

// 日志流
let logStream: any = null

// 监听容器 ID 变化
watch(() => props.containerId, () => {
  if (visible.value && props.containerId) {
    handleRefresh()
  }
})

// 打开对话框
const open = () => {
  visible.value = true
  if (props.containerId) {
    handleRefresh()
  }
}

// 关闭对话框时清理
const handleClosed = () => {
  stopFollowing()
  logs.value = []
}

// 停止实时更新
const stopFollowing = () => {
  if (logStream) {
    logStream.destroy()
    logStream = null
  }
}

// 处理实时更新变化
const handleFollowChange = (value: boolean) => {
  if (value) {
    handleRefresh()
  } else {
    stopFollowing()
  }
}

// 刷新日志
const handleRefresh = async () => {
  if (!props.containerId) return

  // 如果正在实时更新，先停止
  stopFollowing()

  try {
    if (follow.value) {
      // 开始实时更新
      logStream = await dockerStore.followContainerLogs(
        props.containerId,
        {
          timestamps: timestamps.value,
          tail: tail.value,
          onData: (data: string) => {
            logs.value.push(data)
            // 保持滚动到底部
            if (logsContainerRef.value) {
              setTimeout(() => {
                logsContainerRef.value!.scrollTop = logsContainerRef.value!.scrollHeight
              }, 0)
            }
            // 限制日志行数
            if (logs.value.length > 10000) {
              logs.value = logs.value.slice(-10000)
            }
          }
        }
      )
    } else {
      // 获取历史日志
      const result = await dockerStore.getContainerLogs(
        props.containerId,
        {
          timestamps: timestamps.value,
          tail: tail.value
        }
      )
      logs.value = result.split('\n')
    }
  } catch (error) {
    console.error('Failed to get container logs:', error)
    ElMessage.error('获取容器日志失败')
  }
}

// 清空日志
const handleClear = () => {
  logs.value = []
}

// 复制日志
const handleCopy = () => {
  const text = logs.value.join('\n')
  navigator.clipboard.writeText(text)
    .then(() => {
      ElMessage.success('日志已复制到剪贴板')
    })
    .catch(() => {
      ElMessage.error('复制失败')
    })
}

// 下载日志
const handleDownload = () => {
  const text = logs.value.join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `container-${props.containerId}-logs.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 获取日志行的样式类
const getLogClass = (line: string) => {
  if (line.toLowerCase().includes('error')) {
    return 'error'
  }
  if (line.toLowerCase().includes('warn')) {
    return 'warning'
  }
  return ''
}

// 组件卸载时清理
onUnmounted(() => {
  stopFollowing()
})

// 暴露组件方法
defineExpose({
  open
})
</script>

<style scoped>
.container-logs-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.toolbar {
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tail-input {
  width: 120px;
}

.tail-label {
  color: #909399;
}

.actions {
  display: flex;
  gap: 8px;
}

.logs-container {
  height: 500px;
  overflow-y: auto;
  padding: 16px;
  background-color: #1e1e1e;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.logs-container.following {
  scroll-behavior: smooth;
}

.log-line {
  color: #d4d4d4;
}

.log-line.error {
  color: #f56c6c;
}

.log-line.warning {
  color: #e6a23c;
}
</style> 