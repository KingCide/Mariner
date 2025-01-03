<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside width="240px" class="sidebar">
      <div class="logo">
        <img src="../../assets/logo.png" alt="Logo" class="logo-image" />
        <span class="logo-text">Mariner</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        class="menu"
        @select="handleMenuSelect"
      >
        <el-menu-item index="hosts">
          <el-icon><Monitor /></el-icon>
          <span>主机管理</span>
        </el-menu-item>
        <el-menu-item index="containers">
          <el-icon><Box /></el-icon>
          <span>容器管理</span>
        </el-menu-item>
        <el-menu-item index="images">
          <el-icon><Picture /></el-icon>
          <span>镜像管理</span>
        </el-menu-item>
        <el-menu-item index="volumes">
          <el-icon><Files /></el-icon>
          <span>数据卷</span>
        </el-menu-item>
        <el-menu-item index="networks">
          <el-icon><Connection /></el-icon>
          <span>网络</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="32" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="username">管理员</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon>
                设置
              </el-dropdown-item>
              <el-dropdown-item command="about">
                <el-icon><InfoFilled /></el-icon>
                关于
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 头部 -->
      <el-header class="header">
        <div class="breadcrumb">
          <el-breadcrumb>
            <el-breadcrumb-item>首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ getMenuTitle(activeMenu) }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-actions">
          <el-tooltip
            content="最小化"
            placement="bottom"
            :show-after="500"
          >
            <el-button
              class="window-button"
              @click="handleMinimize"
            >
              <el-icon><Minus /></el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip
            :content="isMaximized ? '还原' : '最大化'"
            placement="bottom"
            :show-after="500"
          >
            <el-button
              class="window-button"
              @click="handleMaximize"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip
            content="关闭"
            placement="bottom"
            :show-after="500"
          >
            <el-button
              class="window-button close"
              @click="handleClose"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <!-- 设置对话框 -->
    <settings-dialog
      ref="settingsDialogRef"
    />

    <!-- 关于对话框 -->
    <about-dialog
      ref="aboutDialogRef"
    />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Monitor,
  Box,
  Picture,
  Files,
  Connection,
  User,
  Setting,
  InfoFilled,
  ArrowDown,
  Minus,
  FullScreen,
  Close
} from '@element-plus/icons-vue'
import SettingsDialog from '../settings/SettingsDialog.vue'
import AboutDialog from '../about/AboutDialog.vue'

const router = useRouter()
const settingsDialogRef = ref()
const aboutDialogRef = ref()
const isMaximized = ref(false)

// 当前激活的菜单项
const activeMenu = computed(() => {
  const path = router.currentRoute.value.path
  return path.split('/')[1] || 'hosts'
})

// 获取菜单标题
const getMenuTitle = (menu: string) => {
  switch (menu) {
    case 'hosts':
      return '主机管理'
    case 'containers':
      return '容器管理'
    case 'images':
      return '镜像管理'
    case 'volumes':
      return '数据卷'
    case 'networks':
      return '网络'
    default:
      return ''
  }
}

// 处理菜单选择
const handleMenuSelect = (index: string) => {
  router.push(`/${index}`)
}

// 处理下拉菜单命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'settings':
      settingsDialogRef.value?.open()
      break
    case 'about':
      aboutDialogRef.value?.open()
      break
  }
}

// 处理窗口最小化
const handleMinimize = () => {
  window.electron.ipcRenderer.send('window:minimize')
}

// 处理窗口最大化/还原
const handleMaximize = () => {
  window.electron.ipcRenderer.send('window:maximize')
  isMaximized.value = !isMaximized.value
}

// 处理窗口关闭
const handleClose = () => {
  window.electron.ipcRenderer.send('window:close')
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #dcdfe6;
}

.logo-image {
  width: 32px;
  height: 32px;
  margin-right: 8px;
}

.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
}

.menu {
  flex: 1;
  border-right: none;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #dcdfe6;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: var(--el-color-primary-light-9);
}

.user-avatar {
  background-color: var(--el-color-primary);
}

.username {
  margin: 0 8px;
  flex: 1;
}

.dropdown-icon {
  color: #909399;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
}

.breadcrumb {
  -webkit-app-region: no-drag;
}

.header-actions {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.window-button {
  border: none;
  background: none;
  padding: 8px;
  border-radius: 4px;
}

.window-button:hover {
  background-color: var(--el-color-primary-light-9);
}

.window-button.close:hover {
  background-color: #f56c6c;
  color: #fff;
}

.main {
  background-color: #f5f7fa;
  padding: 16px;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 