<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settingsStore'

const settingsStore = useSettingsStore()

onMounted(async () => {
  // 加载应用设置
  await settingsStore.loadSettings()
})
</script>

<style>
body {
  margin: 0;
  font-family: var(--el-font-family);
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
