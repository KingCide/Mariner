<template>
  <el-dialog
    v-model="visible"
    title="镜像详情"
    width="80%"
    destroy-on-close
  >
    <div v-loading="loading" class="inspect-container">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="ID">{{ imageInfo.Id?.substring(7, 19) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTimestamp(imageInfo.Created) }}</el-descriptions-item>
        <el-descriptions-item label="大小">{{ formatBytes(imageInfo.Size) }}</el-descriptions-item>
        <el-descriptions-item label="虚拟大小">{{ formatBytes(imageInfo.VirtualSize) }}</el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag
            v-for="tag in imageInfo.RepoTags"
            :key="tag"
            class="mx-1"
            size="small"
          >
            {{ tag }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div class="section">
        <h3>构建历史</h3>
        <el-timeline>
          <el-timeline-item
            v-for="(history, index) in imageInfo.History"
            :key="index"
            :timestamp="formatTimestamp(history.Created)"
          >
            {{ history.CreatedBy || history.Comment || '无描述' }}
          </el-timeline-item>
        </el-timeline>
      </div>

      <div class="section">
        <h3>配置信息</h3>
        <el-tabs>
          <el-tab-pane label="环境变量">
            <el-table :data="envVars" stripe>
              <el-table-column prop="key" label="键" />
              <el-table-column prop="value" label="值" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="端口">
            <el-table :data="ports" stripe>
              <el-table-column prop="port" label="端口" />
              <el-table-column prop="protocol" label="协议" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="卷">
            <el-table :data="volumes" stripe>
              <el-table-column prop="path" label="路径" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDockerStore } from '../../stores/dockerStore'
import { formatBytes, formatTimestamp } from '../../utils/format'

const props = defineProps<{
  imageId: string
  hostId: string
}>()

const visible = ref(true)
const loading = ref(true)
const dockerStore = useDockerStore()
const imageInfo = ref<any>({})

// 获取镜像详情
const fetchImageInfo = async () => {
  try {
    imageInfo.value = await dockerStore.inspectImage(props.hostId, props.imageId)
    loading.value = false
  } catch (error) {
    console.error('Failed to fetch image info:', error)
  }
}

// 解析环境变量
const envVars = computed(() => {
  const env = imageInfo.value.Config?.Env || []
  return env.map((item: string) => {
    const [key, value] = item.split('=')
    return { key, value }
  })
})

// 解析端口
const ports = computed(() => {
  const exposedPorts = imageInfo.value.Config?.ExposedPorts || {}
  return Object.keys(exposedPorts).map(port => {
    const [portNumber, protocol] = port.split('/')
    return { port: portNumber, protocol }
  })
})

// 解析卷
const volumes = computed(() => {
  const vols = imageInfo.value.Config?.Volumes || {}
  return Object.keys(vols).map(path => ({ path }))
})

// 获取数据
fetchImageInfo()

defineExpose({
  visible
})
</script>

<style scoped>
.inspect-container {
  padding: 20px;
}

.section {
  margin-top: 24px;
}

.section h3 {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mx-1 {
  margin: 0 4px;
}

:deep(.el-descriptions) {
  margin-bottom: 24px;
}

:deep(.el-timeline) {
  margin: 16px 0;
}

:deep(.el-timeline-item__content) {
  font-size: 14px;
}

:deep(.el-tabs) {
  margin-top: 16px;
}
</style> 