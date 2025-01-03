<template>
  <el-dialog
    v-model="visible"
    title="关于"
    width="400px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    class="about-dialog"
  >
    <div class="about-content">
      <el-image :src="logoUrl" class="app-logo" />
      <h2 class="app-name">Mariner</h2>
      <div class="version">版本 {{ version }}</div>

      <div class="info-list">
        <div class="info-item">
          <span class="label">Electron:</span>
          <span class="value">{{ versions.electron }}</span>
        </div>
        <div class="info-item">
          <span class="label">Chrome:</span>
          <span class="value">{{ versions.chrome }}</span>
        </div>
        <div class="info-item">
          <span class="label">Node.js:</span>
          <span class="value">{{ versions.node }}</span>
        </div>
        <div class="info-item">
          <span class="label">V8:</span>
          <span class="value">{{ versions.v8 }}</span>
        </div>
        <div class="info-item">
          <span class="label">操作系统:</span>
          <span class="value">{{ versions.os }}</span>
        </div>
      </div>

      <div class="actions">
        <el-button @click="handleCheckUpdate">
          <el-icon><Refresh /></el-icon>
          检查更新
        </el-button>
        <el-button @click="handleOpenWebsite">
          <el-icon><Link /></el-icon>
          访问官网
        </el-button>
      </div>

      <div class="copyright">
        Copyright © {{ new Date().getFullYear() }} Mariner
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Link } from '@element-plus/icons-vue'
import logo from '../../assets/logo.png'

const visible = ref(false)
const version = ref('1.0.0')
const versions = ref({
  electron: '',
  chrome: '',
  node: '',
  v8: '',
  os: ''
})

const logoUrl = logo

// 打开对话框
const open = async () => {
  visible.value = true
  // 获取版本信息
  try {
    const info = await window.electron.ipcRenderer.invoke('app:getVersions')
    version.value = info.version
    versions.value = info.versions
  } catch (error) {
    console.error('Failed to get versions:', error)
  }
}

// 检查更新
const handleCheckUpdate = async () => {
  try {
    const hasUpdate = await window.electron.ipcRenderer.invoke('app:checkUpdate')
    if (!hasUpdate) {
      ElMessage.success('当前已是最新版本')
    }
  } catch (error) {
    console.error('Failed to check update:', error)
    ElMessage.error('检查更新失败')
  }
}

// 打开官网
const handleOpenWebsite = () => {
  window.electron.ipcRenderer.send('app:openWebsite')
}

// 暴露组件方法
defineExpose({
  open
})
</script>

<style scoped>
.about-content {
  text-align: center;
  padding: 20px 0;
}

.logo {
  width: 96px;
  height: 96px;
  margin-bottom: 16px;
}

.app-name {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px;
  color: var(--el-color-primary);
}

.version {
  font-size: 14px;
  color: #909399;
  margin-bottom: 24px;
}

.info-list {
  text-align: left;
  margin: 0 auto;
  width: fit-content;
  margin-bottom: 24px;
}

.info-item {
  margin-bottom: 8px;
  display: flex;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item .label {
  width: 80px;
  color: #909399;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.copyright {
  font-size: 12px;
  color: #909399;
}
</style> 