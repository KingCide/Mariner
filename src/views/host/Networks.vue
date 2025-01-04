<template>
  <div class="networks">
    <div class="toolbar">
      <el-button type="primary" @click="handleCreate">
        创建网络
      </el-button>
      <el-input
        v-model="searchText"
        placeholder="搜索网络"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredNetworks"
      style="width: 100%"
    >
      <el-table-column prop="id" label="网络ID" width="120">
        <template #default="{ row }">
          <el-text type="info">{{ row.id.substring(0, 12) }}</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="name" label="名称" min-width="200" />

      <el-table-column prop="driver" label="驱动" width="120" />

      <el-table-column prop="scope" label="范围" width="120" />

      <el-table-column label="子网" min-width="200">
        <template #default="{ row }">
          <div v-for="config in row.ipam.config" :key="config.subnet">
            {{ config.subnet }}
          </div>
        </template>
      </el-table-column>

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
                    删除网络
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建网络对话框 -->
    <create-network-dialog
      ref="createNetworkDialogRef"
      :host-id="hostId"
      @created="handleNetworkCreated"
    />

    <!-- 网络详情对话框 -->
    <network-inspect-dialog
      ref="inspectDialogRef"
      :host-id="hostId"
      :network-id="selectedNetworkId"
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
import CreateNetworkDialog from '../../components/docker/CreateNetworkDialog.vue'
import NetworkInspectDialog from '../../components/docker/NetworkInspectDialog.vue'
import type { Network } from '../../../types/docker'

const route = useRoute()
const dockerStore = useDockerStore()
const hostId = computed(() => route.params.id as string)

// 组件引用
const createNetworkDialogRef = ref()
const inspectDialogRef = ref()

// 状态
const loading = ref(false)
const searchText = ref('')
const selectedNetworkId = ref('')

// 自动刷新定时器
let refreshTimer: number | null = null

// 计算属性
const networks = computed(() => dockerStore.networks)
const filteredNetworks = computed(() => {
  if (!searchText.value) return networks.value

  const search = searchText.value.toLowerCase()
  return networks.value.filter(network => 
    network.id.toLowerCase().includes(search) ||
    network.name.toLowerCase().includes(search) ||
    network.driver.toLowerCase().includes(search)
  )
})

// 生命周期钩子
onMounted(async () => {
  await refreshNetworks()
  // 每30秒自动刷新一次
  refreshTimer = window.setInterval(refreshNetworks, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

// 方法
const refreshNetworks = async () => {
  loading.value = true
  try {
    await dockerStore.refreshNetworks(hostId.value)
  } catch (error) {
    console.error('Failed to refresh networks:', error)
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  createNetworkDialogRef.value?.open()
}

const handleNetworkCreated = () => {
  refreshNetworks()
}

const handleInspect = (network: Network) => {
  selectedNetworkId.value = network.id
  inspectDialogRef.value?.open()
}

const handleDelete = async (network: Network) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个网络吗？此操作不可恢复。',
      '删除网络',
      {
        type: 'warning'
      }
    )
    
    await dockerStore.deleteNetwork(hostId.value, network.id)
    ElMessage.success('网络已删除')
    refreshNetworks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${(error as Error).message}`)
    }
  }
}
</script>

<style scoped>
.networks {
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