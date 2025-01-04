<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    class="local-config-form"
  >
    <el-form-item label="主机名称" prop="name">
      <el-input v-model="form.name" placeholder="请输入主机名称" />
    </el-form-item>

    <el-alert
      v-if="localDockerAvailable"
      type="success"
      :closable="false"
      show-icon
    >
      检测到本地 Docker 可用
    </el-alert>
    <el-alert
      v-else
      type="error"
      :closable="false"
      show-icon
    >
      未检测到本地 Docker，请确保 Docker 已安装并运行
    </el-alert>

    <el-form-item>
      <el-button @click="handleSubmit" :disabled="!localDockerAvailable">保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useDockerStore } from '../../stores/dockerStore'
import type { DockerHost } from '../../../types/docker'

const dockerStore = useDockerStore()

const formRef = ref<FormInstance>()
const localDockerAvailable = ref(false)
const form = reactive({
  name: '本地Docker'
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入主机名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

const checkLocalDocker = async () => {
  try {
    localDockerAvailable.value = await window.electron.ipcRenderer.invoke('docker:checkLocal')
  } catch (error) {
    console.error('Failed to check local Docker:', error)
    localDockerAvailable.value = false
  }
}

const handleSubmit = async () => {
  try {
    const valid = await formRef.value?.validate()
    if (!valid) return

    const host: Omit<DockerHost, 'id' | 'status'> = {
      name: form.name,
      connectionType: 'local',
      config: {}
    }

    await dockerStore.addHost(host)
    ElMessage.success('保存成功')
    emit('saved')
  } catch (error) {
    ElMessage.error(`保存失败: ${(error as Error).message}`)
  }
}

const emit = defineEmits<{
  (event: 'saved'): void
}>()

onMounted(() => {
  checkLocalDocker()
})
</script>

<style scoped>
.local-config-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.el-alert {
  margin: 20px 0;
}
</style> 