<template>
  <div class="volumes">
    <div class="toolbar">
      <el-button type="primary" @click="handleCreate">
        创建数据卷
      </el-button>
      <el-input
        v-model="searchText"
        placeholder="搜索数据卷"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredVolumes"
      style="width: 100%"
    >
      <el-table-column prop="name" label="名称" min-width="200" />

      <el-table-column prop="driver" label="驱动" width="120" />

      <el-table-column prop="mountpoint" label="挂载点" min-width="300" />

      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-dropdown trigger="click">
              <el-button :icon="More" circle />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleInspect(row)">
                    查看详情
                  </el-dropdown-item>
                  <el-dropdown-item
                    divided
                    @click="handleDelete(row)"
                  >
                    删除数据卷
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建数据卷对话框 -->
    <create-volume-dialog
      ref="createVolumeDialogRef"
      :host-id="hostId"
      @created="handleVolumeCreated"
    />

    <!-- 数据卷详情对话框 -->
    <volume-inspect-dialog
      ref="inspectDialogRef"
      :host-id="hostId"
      :volume-name="selectedVolumeName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  More,
  Search
} from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import CreateVolumeDialog from '../../components/docker/CreateVolumeDialog.vue'
import VolumeInspectDialog from '../../components/docker/VolumeInspectDialog.vue'
import type { Volume } from '../../../types/docker'

const route = useRoute()
const dockerStore = useDockerStore()
const hostId = computed(() => route.params.id as string)

// 组件引用
const createVolumeDialogRef = ref()
const inspectDialogRef = ref()

// 状态
const loading = ref(false)
const searchText = ref('')
const selectedVolumeName = ref('')

// 自动刷新定时器
let refreshTimer: number | null = null

// 计算属性
const volumes = computed(() => dockerStore.volumes)
const filteredVolumes = computed(() => {
  if (!searchText.value) return volumes.value

  const search = searchText.value.toLowerCase()
  return volumes.value.filter(volume => 
    volume.name.toLowerCase().includes(search) ||
    volume.driver.toLowerCase().includes(search)
  )
})

// 生命周期钩子
onMounted(async () => {
  await refreshVolumes()
  // 每30秒自动刷新一次
  refreshTimer = window.setInterval(refreshVolumes, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 方法
const refreshVolumes = async () => {
  loading.value = true
  try {
    await dockerStore.refreshVolumes(hostId.value)
  } catch (error) {
    console.error('Failed to refresh volumes:', error)
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  createVolumeDialogRef.value?.open()
}

const handleVolumeCreated = () => {
  refreshVolumes()
}

const handleInspect = (volume: Volume) => {
  selectedVolumeName.value = volume.name
  inspectDialogRef.value?.open()
}

const handleDelete = async (volume: Volume) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个数据卷吗？此操作不可恢复。',
      '删除数据卷',
      {
        type: 'warning'
      }
    )
    
    await dockerStore.deleteVolume(hostId.value, volume.name)
    ElMessage.success('数据卷已删除')
    refreshVolumes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${(error as Error).message}`)
    }
  }
}
</script>

<style scoped>
.volumes {
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

:deep(.el-button-group) {
  display: flex;
  gap: 4px;
}
</style> 