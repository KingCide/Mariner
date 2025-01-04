<template>
  <el-container class="main-layout">
    <el-container class="main-container">
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
// 主布局组件，目前只包含一个简单的路由视图
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.main-container {
  height: 100%;
}

.main {
  padding: 0;
  height: 100%;
  background-color: var(--el-bg-color-page);
}
</style> 