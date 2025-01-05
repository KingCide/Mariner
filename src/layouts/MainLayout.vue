<template>
  <v-app>
    <!-- 标题栏 -->
    <v-app-bar class="title-bar" height="32" flat>
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
    <v-main class="main-container">
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
  settingsDialogRef.value?.open()
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

<style scoped>
.title-bar {
  -webkit-app-region: drag;
  background-color: var(--background-paper) !important;
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-primary);
}

.window-controls {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 2px;
}

.control-button {
  height: 32px !important;
  width: 32px !important;
  min-width: unset !important;
  border-radius: 0 !important;
  color: var(--text-primary) !important;
}

.control-button:hover {
  background-color: rgba(0, 0, 0, 0.04) !important;
}

.control-button.close:hover {
  background-color: rgb(232, 17, 35) !important;
  color: white !important;
}

.main-container {
  padding: 0;
}
</style> 