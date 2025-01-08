<template>
  <v-app class="app-root">
    <!-- 标题栏 -->
    <v-app-bar class="title-bar" height="40" flat>
      <div class="title-left">
        <img src="../assets/logo.png" alt="Logo" class="logo-image" />
        <span class="title-text">Mariner</span>
      </div>
      <v-spacer></v-spacer>
      <div class="window-controls">
        <v-btn
          icon
          variant="text"
          size="small"
          class="control-button settings-button"
          @click="showSettings"
        >
          <v-icon>mdi-cog</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          size="small"
          class="control-button"
          @click="minimizeWindow"
        >
          <v-icon>mdi-minus</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          size="small"
          class="control-button"
          @click="toggleMaximize"
        >
          <v-icon>{{ isMaximized ? 'mdi-window-restore' : 'mdi-window-maximize' }}</v-icon>
        </v-btn>
        <v-btn
          icon
          variant="text"
          size="small"
          class="control-button close"
          @click="closeWindow"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </v-app-bar>

    <!-- 主内容区 -->
    <v-main class="main-content">
      <router-view />
    </v-main>

    <!-- 设置对话框 -->
    <settings-dialog ref="settingsDialogRef" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SettingsDialog from '../components/settings/SettingsDialog.vue'

const isMaximized = ref(false)
const settingsDialogRef = ref()

// 窗口控制函数
const minimizeWindow = () => {
  window.electron.ipcRenderer.send('window:minimize')
}

const toggleMaximize = () => {
  window.electron.ipcRenderer.send('window:maximize')
  isMaximized.value = !isMaximized.value
}

const closeWindow = () => {
  window.electron.ipcRenderer.send('window:close')
}

const showSettings = () => {
  settingsDialogRef.value?.show()
}

// 监听窗口状态变化
let removeListener: (() => void) | null = null

onMounted(() => {
  // 添加窗口状态监听
  removeListener = window.electron.ipcRenderer.on('window-state-change', (_event: any, maximized: boolean) => {
    isMaximized.value = maximized
  })
})

onUnmounted(() => {
  // 移除窗口状态监听
  if (removeListener) {
    removeListener()
  }
})
</script>

<style>
/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}

::-webkit-scrollbar-track {
  display: none;
}

::-webkit-scrollbar-thumb {
  display: none;
}

/* 移除悬停样式，因为已经隐藏了滚动条 */
::-webkit-scrollbar-thumb:hover {
  background-color: transparent;
}
</style>

<style scoped>
.app-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
}

.title-bar {
  -webkit-app-region: drag;
  background-color: rgb(var(--v-theme-surface)) !important;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
}

.logo-image {
  width: 24px;
  height: 24px;
}

.title-text {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 2px;
  margin-right: -8px;
}

.control-button {
  height: 40px !important;
  width: 40px !important;
  min-width: unset !important;
  border-radius: 0 !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.control-button:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}

.control-button.close:hover {
  background-color: rgb(232, 17, 35) !important;
  color: white !important;
}
</style> 