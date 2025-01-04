<template>
  <div class="images">
    <div class="toolbar">
      <el-input
        v-model="searchText"
        placeholder="搜索镜像"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredImages"
      style="width: 100%"
    >
      <el-table-column prop="id" label="镜像ID" width="120">
        <template #default="{ row }">
          <el-text type="info">{{ row.id.substring(7, 19) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column label="标签" min-width="200">
        <template #default="{ row }">
          <div v-for="tag in row.tags" :key="tag" class="tag-item">
            {{ tag }}
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="大小" width="120">
        <template #default="{ row }">
          {{ formatSize(row.size) }}
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
              type="primary"
              :icon="VideoPlay"
              circle
              @click="handleCreateContainer(row)"
            />
            <el-dropdown trigger="click">
              <el-button :icon="More" circle />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handlePull(row)">
                    拉取最新版本
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleInspect(row)">
                    查看详情
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleExport(row)">
                    导出镜像
                  </el-dropdown-item>
                  <el-dropdown-item
                    divided
                    @click="handleDelete(row)"
                  >
                    删除镜像
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
      :host-id="hostId"
      :image="selectedImage"
      @created="handleContainerCreated"
    />

    <!-- 镜像详情对话框 -->
    <image-inspect-dialog
      ref="inspectDialogRef"
      :host-id="hostId"
      :image-id="selectedImageId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  VideoPlay,
  More,
  Search
} from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import CreateContainerDialog from '../../components/docker/CreateContainerDialog.vue'
import ImageInspectDialog from '../../components/docker/ImageInspectDialog.vue'
import type { ImageInfo } from '../../../types/docker'

const route = useRoute()
const dockerStore = useDockerStore()
const hostId = computed(() => route.params.id as string)

// 组件引用
const createContainerDialogRef = ref()
const inspectDialogRef = ref()

// 状态
const loading = ref(false)
const searchText = ref('')
const selectedImage = ref<ImageInfo | null>(null)
const selectedImageId = ref('')

// 自动刷新定时器
let refreshTimer: number | null = null

// 计算属性
const images = computed(() => dockerStore.images)
const filteredImages = computed(() => {
  if (!searchText.value) return images.value

  const search = searchText.value.toLowerCase()
  return images.value.filter(image => 
    image.id.toLowerCase().includes(search) ||
    image.tags.some(tag => tag.toLowerCase().includes(search))
  )
})

// 生命周期钩子
onMounted(async () => {
  await refreshImages()
  // 每30秒自动刷新一次
  refreshTimer = window.setInterval(refreshImages, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 方法
const refreshImages = async () => {
  loading.value = true
  try {
    await dockerStore.refreshImages(hostId.value)
  } catch (error) {
    console.error('Failed to refresh images:', error)
  } finally {
    loading.value = false
  }
}

const formatSize = (size: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unit = 0
  while (value > 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString()
}

const handleCreateContainer = (image: ImageInfo) => {
  selectedImage.value = image
  createContainerDialogRef.value?.open()
}

const handleContainerCreated = () => {
  selectedImage.value = null
}

const handlePull = async (image: ImageInfo) => {
  try {
    const tag = image.tags[0]
    if (!tag) {
      ElMessage.error('镜像没有标签')
      return
    }

    await dockerStore.pullImage(hostId.value, tag)
    ElMessage.success('镜像已更新')
    refreshImages()
  } catch (error) {
    ElMessage.error(`更新失败: ${(error as Error).message}`)
  }
}

const handleInspect = (image: ImageInfo) => {
  selectedImageId.value = image.id
  inspectDialogRef.value?.open()
}

const handleExport = async (image: ImageInfo) => {
  try {
    await dockerStore.exportImage(hostId.value, image.id)
    ElMessage.success('镜像已导出')
  } catch (error) {
    ElMessage.error(`导出失败: ${(error as Error).message}`)
  }
}

const handleDelete = async (image: ImageInfo) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个镜像吗？此操作不可恢复。',
      '删除镜像',
      {
        type: 'warning'
      }
    )
    
    await dockerStore.deleteImage(hostId.value, image.id)
    ElMessage.success('镜像已删除')
    refreshImages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${(error as Error).message}`)
    }
  }
}
</script>

<style scoped>
.images {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
}

.search-input {
  width: 300px;
}

.tag-item {
  margin-bottom: 4px;
}

.tag-item:last-child {
  margin-bottom: 0;
}

:deep(.el-button-group) {
  display: flex;
  gap: 4px;
}
</style> 