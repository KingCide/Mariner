<template>
  <v-form
    ref="formRef"
    v-model="valid"
    class="local-config-form"
  >
    <v-row dense>
      <!-- 主机名称 -->
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.name"
          label="主机名称"
          variant="outlined"
          density="compact"
          :rules="nameRules"
          placeholder="请输入主机名称"
        ></v-text-field>
      </v-col>

      <!-- Docker状态提示 -->
      <v-col cols="12">
        <v-alert
          :type="localDockerAvailable ? 'success' : 'error'"
          variant="tonal"
          :text="localDockerAvailable ? '检测到本地 Docker 可用' : '未检测到本地 Docker，请确保 Docker 已安装并运行'"
        ></v-alert>
      </v-col>

      <!-- 操作按钮 -->
      <v-col cols="12" class="d-flex justify-center">
        <v-btn
          @click="handleSubmit"
          :disabled="!localDockerAvailable"
        >
          保存
        </v-btn>
      </v-col>
    </v-row>
  </v-form>

  <!-- 添加 snackbar -->
  <v-snackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    :timeout="3000"
    location="top"
  >
    {{ snackbar.text }}
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { VForm } from 'vuetify/components'
import { useDockerStore } from '../../stores/dockerStore'
import type { DockerHost } from '../../../types/docker'

const dockerStore = useDockerStore()

const formRef = ref<VForm>()
const localDockerAvailable = ref(false)
const form = reactive({
  name: '本地Docker'
})

const nameRules = [
  (v: string) => !!v || '请输入主机名称',
  (v: string) => (v && v.length >= 2 && v.length <= 50) || '长度在 2 到 50 个字符'
]

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

const showMessage = (text: string, color: 'success' | 'error' = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
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
    const { valid } = await formRef.value?.validate() || { valid: false }
    if (!valid) return

    const host: Omit<DockerHost, 'id' | 'status'> = {
      name: form.name,
      connectionType: 'local',
      config: {}
    }

    await dockerStore.addHost(host)
    showMessage('保存成功')
    emit('saved')
  } catch (error) {
    showMessage(`保存失败: ${(error as Error).message}`, 'error')
  }
}

const emit = defineEmits<{
  (event: 'saved'): void
}>()

const valid = ref(false)

onMounted(() => {
  checkLocalDocker()
})
</script>

<style scoped>
.local-config-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style> 