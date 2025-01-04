<template>
  <el-container class="main-layout">
    <!-- 标题栏 -->
    <el-header class="title-bar" height="32px">
      <div class="title-left">
        <img src="../assets/logo.png" alt="Logo" class="logo-image" />
        <span class="title-text">Mariner</span>
      </div>
      <div class="window-controls">
        <button class="control-button" @click="minimizeWindow">
          <el-icon><Minus /></el-icon>
        </button>
        <button class="control-button" @click="toggleMaximize">
          <el-icon><component :is="isMaximized ? 'FullScreen' : 'FullScreen'" /></el-icon>
        </button>
        <button class="control-button close" @click="closeWindow">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Close, Minus, FullScreen } from '@element-plus/icons-vue'

const isMaximized = ref(false)

// 窗口控制函数
const minimizeWindow = () => {
  window.electron.ipcRenderer.send('window:minimize')
}

const toggleMaximize = () => {
  window.electron.ipcRenderer.send('window:maximize')
}

const closeWindow = () => {
  window.electron.ipcRenderer.send('window:close')
}

// 监听窗口状态变化
const handleMaximizeChange = (_event: any, maximized: boolean) => {
  isMaximized.value = maximized
}

let removeListener: (() => void) | null = null

onMounted(() => {
  // 添加窗口状态监听
  removeListener = window.electron.ipcRenderer.on('window-state-change', handleMaximizeChange)
})

onUnmounted(() => {
  // 移除窗口状态监听
  if (removeListener) {
    removeListener()
  }
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
  border: 1px solid var(--el-border-color-light);
}

.title-bar {
  -webkit-app-region: drag;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-image {
  width: 20px;
  height: 20px;
}

.title-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 4px;
}

.control-button {
  -webkit-app-region: no-drag;
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button:hover {
  background-color: var(--el-fill-color-light);
}

.control-button.close:hover {
  background-color: #f56c6c;
  color: white;
}

.main-container {
  height: calc(100% - 32px);
}

.main {
  padding: 0;
  height: 100%;
  background-color: var(--el-bg-color-page);
}
</style> 