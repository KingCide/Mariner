<template>
  <div class="images">
    <div class="toolbar">
      <el-button type="primary" @click="dialogVisible = true">
        拉取镜像
      </el-button>
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
      <el-table-column prop="Id" label="ID" width="120">
        <template #default="{ row }">
          <el-text type="info">{{ row.Id.substring(7, 19) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column label="标签" min-width="200">
        <template #default="{ row }">
          <el-text>{{ formatTags(row) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="Size" label="大小" width="120">
        <template #default="{ row }">
          <el-text>{{ formatSize(row.Size) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="Created" label="创建时间" width="180">
        <template #default="{ row }">
          <el-text>{{ formatDate(row.Created) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              type="primary"
              size="small"
              @click="handleExport(row)"
            >
              导出
            </el-button>
            <el-dropdown>
              <el-button size="small">
                <el-icon><More /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
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

    <!-- 拉取镜像对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="拉取镜像"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="镜像名称" prop="imageName">
          <el-input
            v-model="form.imageName"
            placeholder="例如：nginx:latest"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handlePull">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { Search, More } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import type { ImageInfo } from '../../../types/docker'

const route = useRoute()
const dockerStore = useDockerStore()
const hostId = computed(() => route.params.id as string)
const loading = computed(() => dockerStore.loading)
const images = computed(() => dockerStore.images || [])
const searchText = ref('')

// 拉取镜像对话框
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  imageName: ''
})

const rules = {
  imageName: [
    { required: true, message: '请输入镜像名称', trigger: 'blur' }
  ]
}

// 过滤镜像列表
const filteredImages = computed(() => {
  if (!searchText.value) return images.value
  const search = searchText.value.toLowerCase()
  return images.value.filter(image => 
    image.RepoTags?.some(tag => tag.toLowerCase().includes(search)) ||
    image.Id.toLowerCase().includes(search)
  )
})

// 格式化镜像标签
const formatTags = (image: ImageInfo) => {
  if (!image.RepoTags || image.RepoTags.length === 0) {
    return '<none>'
  }
  return image.RepoTags.join(', ')
}

// 格式化镜像大小
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

// 格式化创建时间
const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleString()
}

// 自动刷新
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshImages()
  // 每30秒自动刷新一次
  refreshInterval = setInterval(refreshImages, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// 刷新镜像列表
const refreshImages = async () => {
  try {
    await dockerStore.refreshImages(hostId.value)
  } catch (error) {
    console.error('Failed to refresh images:', error)
  }
}

// 处理镜像操作
const handlePull = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (!valid) return

    await dockerStore.pullImage(hostId.value, form.imageName)
    ElMessage.success('镜像拉取成功')
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(`拉取失败: ${(error as Error).message}`)
  }
}

const handleExport = async (image: ImageInfo) => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:openFile', {
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const savePath = `${result.filePaths[0]}/${image.RepoTags?.[0] || image.Id}.tar`
      await dockerStore.exportImage(hostId.value, image.Id, savePath)
      ElMessage.success('镜像导出成功')
    }
  } catch (error) {
    ElMessage.error(`导出失败: ${(error as Error).message}`)
  }
}

const handleDelete = async (image: ImageInfo) => {
  try {
    await ElMessageBox.confirm('确定要删除该镜像吗？', '警告', {
      type: 'warning'
    })
    await dockerStore.deleteImage(hostId.value, image.Id)
    ElMessage.success('镜像已删除')
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