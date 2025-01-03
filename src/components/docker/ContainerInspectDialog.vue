<template>
  <el-dialog
    v-model="visible"
    title="容器详情"
    width="800px"
    :close-on-click-modal="false"
    class="container-inspect-dialog"
  >
    <div v-loading="loading" class="inspect-content">
      <el-tabs v-model="activeTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="ID">
              {{ info.Id }}
            </el-descriptions-item>
            <el-descriptions-item label="名称">
              {{ info.Name?.replace(/^\//, '') }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatTime(info.Created) }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              {{ info.State?.Status }}
            </el-descriptions-item>
            <el-descriptions-item label="镜像">
              {{ info.Config?.Image }}
            </el-descriptions-item>
            <el-descriptions-item label="平台">
              {{ info.Platform }}
            </el-descriptions-item>
            <el-descriptions-item label="工作目录">
              {{ info.Config?.WorkingDir || '/' }}
            </el-descriptions-item>
            <el-descriptions-item label="重启策略">
              {{ info.HostConfig?.RestartPolicy?.Name }}
            </el-descriptions-item>
          </el-descriptions>

          <template v-if="info.State">
            <h3>运行状态</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="运行状态">
                {{ info.State.Status }}
              </el-descriptions-item>
              <el-descriptions-item label="运行时间">
                {{ info.State.StartedAt ? formatDuration(info.State.StartedAt) : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="进程 ID">
                {{ info.State.Pid }}
              </el-descriptions-item>
              <el-descriptions-item label="退出码">
                {{ info.State.ExitCode }}
              </el-descriptions-item>
              <el-descriptions-item label="错误信息" :span="2">
                {{ info.State.Error || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </el-tab-pane>

        <!-- 网络设置 -->
        <el-tab-pane label="网络设置" name="network">
          <template v-if="info.NetworkSettings?.Networks">
            <div
              v-for="(network, name) in info.NetworkSettings.Networks"
              :key="name"
              class="network-item"
            >
              <h3>{{ name }}</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="网络 ID">
                  {{ network.NetworkID }}
                </el-descriptions-item>
                <el-descriptions-item label="IP 地址">
                  {{ network.IPAddress }}
                </el-descriptions-item>
                <el-descriptions-item label="网关">
                  {{ network.Gateway }}
                </el-descriptions-item>
                <el-descriptions-item label="MAC 地址">
                  {{ network.MacAddress }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </template>

          <template v-if="info.NetworkSettings?.Ports">
            <h3>端口映射</h3>
            <el-table :data="portMappings" style="width: 100%">
              <el-table-column prop="container" label="容器端口" />
              <el-table-column prop="host" label="主机端口" />
              <el-table-column prop="protocol" label="协议" width="100" />
            </el-table>
          </template>
        </el-tab-pane>

        <!-- 挂载卷 -->
        <el-tab-pane label="挂载卷" name="volumes">
          <el-table :data="volumeMounts" style="width: 100%">
            <el-table-column prop="source" label="主机路径" show-overflow-tooltip />
            <el-table-column prop="destination" label="容器路径" show-overflow-tooltip />
            <el-table-column prop="mode" label="模式" width="100" />
            <el-table-column prop="type" label="类型" width="100" />
          </el-table>
        </el-tab-pane>

        <!-- 环境变量 -->
        <el-tab-pane label="环境变量" name="env">
          <el-table :data="envVariables" style="width: 100%">
            <el-table-column prop="key" label="变量名" show-overflow-tooltip />
            <el-table-column prop="value" label="变量值" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>

        <!-- 资源限制 -->
        <el-tab-pane label="资源限制" name="resources">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="CPU 限制">
              {{ formatCpuLimit(info.HostConfig?.NanoCpus) }}
            </el-descriptions-item>
            <el-descriptions-item label="内存限制">
              {{ formatMemoryLimit(info.HostConfig?.Memory) }}
            </el-descriptions-item>
            <el-descriptions-item label="CPU 份额">
              {{ info.HostConfig?.CpuShares || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="内存交换限制">
              {{ formatMemoryLimit(info.HostConfig?.MemorySwap) }}
            </el-descriptions-item>
            <el-descriptions-item label="OOM 终止">
              {{ info.HostConfig?.OomKillDisable ? '禁用' : '启用' }}
            </el-descriptions-item>
            <el-descriptions-item label="PID 限制">
              {{ info.HostConfig?.PidsLimit || '无限制' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 原始数据 -->
        <el-tab-pane label="原始数据" name="raw">
          <el-input
            v-model="rawData"
            type="textarea"
            :rows="20"
            readonly
            class="raw-data"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="handleRefresh">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(duration)
dayjs.extend(relativeTime)

const props = defineProps<{
  containerId: string
}>()

const dockerStore = useDockerStore()
const visible = ref(false)
const loading = ref(false)
const activeTab = ref('basic')
const info = ref<any>({})

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 格式化运行时间
const formatDuration = (startTime: string) => {
  if (!startTime) return '-'
  const start = dayjs(startTime)
  const now = dayjs()
  return dayjs.duration(now.diff(start)).humanize()
}

// 格式化 CPU 限制
const formatCpuLimit = (nanoCpus: number) => {
  if (!nanoCpus) return '无限制'
  return `${nanoCpus / 1e9} CPU`
}

// 格式化内存限制
const formatMemoryLimit = (bytes: number) => {
  if (!bytes) return '无限制'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

// 端口映射列表
const portMappings = computed(() => {
  const ports = info.value.NetworkSettings?.Ports || {}
  return Object.entries(ports).map(([containerPort, hostPorts]) => {
    const [port, protocol] = containerPort.split('/')
    return {
      container: port,
      host: hostPorts?.[0]?.HostPort || '-',
      protocol
    }
  })
})

// 挂载卷列表
const volumeMounts = computed(() => {
  return (info.value.Mounts || []).map((mount: any) => ({
    source: mount.Source,
    destination: mount.Destination,
    mode: mount.Mode,
    type: mount.Type
  }))
})

// 环境变量列表
const envVariables = computed(() => {
  return (info.value.Config?.Env || []).map((env: string) => {
    const [key, ...values] = env.split('=')
    return {
      key,
      value: values.join('=')
    }
  })
})

// 原始数据
const rawData = computed(() => {
  return JSON.stringify(info.value, null, 2)
})

// 打开对话框
const open = () => {
  visible.value = true
  handleRefresh()
}

// 刷新容器信息
const handleRefresh = async () => {
  if (!props.containerId) return

  loading.value = true
  try {
    info.value = await dockerStore.inspectContainer(props.containerId)
  } catch (error) {
    console.error('Failed to inspect container:', error)
    ElMessage.error('获取容器详情失败')
  } finally {
    loading.value = false
  }
}

// 暴露组件方法
defineExpose({
  open
})
</script>

<style scoped>
.inspect-content {
  max-height: 60vh;
  overflow-y: auto;
}

.network-item {
  margin-bottom: 24px;
}

.network-item:last-child {
  margin-bottom: 0;
}

.raw-data {
  font-family: monospace;
  font-size: 12px;
}

:deep(.el-descriptions__label) {
  width: 120px;
}
</style> 