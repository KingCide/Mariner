<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加Docker主机"
    width="700px"
    :close-on-click-modal="false"
    :before-close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="SSH连接" name="ssh">
        <SSHConfigForm @saved="handleSaved" />
      </el-tab-pane>
      <el-tab-pane label="TCP连接" name="tcp">
        <!-- TODO: 实现TCP连接配置表单 -->
        <div>TCP连接配置（开发中）</div>
      </el-tab-pane>
      <el-tab-pane label="本地Docker" name="local">
        <!-- TODO: 实现本地Docker配置表单 -->
        <div>本地Docker配置（开发中）</div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SSHConfigForm from './SSHConfigForm.vue'

const dialogVisible = ref(false)
const activeTab = ref('ssh')

const handleClose = (done: () => void) => {
  done()
}

const handleSaved = () => {
  dialogVisible.value = false
}

// 暴露方法给父组件
defineExpose({
  open: () => {
    dialogVisible.value = true
  },
  close: () => {
    dialogVisible.value = false
  }
})
</script>

<style scoped>
:deep(.el-dialog__body) {
  padding-top: 10px;
}
</style> 