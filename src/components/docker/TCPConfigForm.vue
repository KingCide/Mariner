<template>
  <v-form
    ref="formRef"
    v-model="valid"
    class="tcp-config-form"
  >
    <v-row dense>
      <!-- 主机名称和地址 -->
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

      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.host"
          label="主机地址"
          variant="outlined"
          density="compact"
          :rules="hostRules"
          placeholder="请输入主机IP或域名"
        ></v-text-field>
      </v-col>

      <!-- Docker端口 -->
      <v-col cols="12" sm="6">
        <v-text-field
          v-model.number="form.port"
          label="Docker端口"
          type="number"
          variant="outlined"
          density="compact"
          hint="默认为2375"
          :rules="portRules"
        ></v-text-field>
      </v-col>

      <!-- TLS证书 -->
      <v-col cols="12">
        <v-text-field
          v-model="form.certPath"
          label="TLS证书"
          variant="outlined"
          density="compact"
          placeholder="证书目录路径（可选）"
          readonly
          append-inner-icon="mdi-folder"
          @click:append-inner="selectCertPath"
          hint="如果启用了 TLS，请选择包含 ca.pem、cert.pem 和 key.pem 的目录"
          persistent-hint
        ></v-text-field>
      </v-col>

      <!-- 操作按钮 -->
      <v-col cols="12" class="d-flex justify-center">
        <v-btn
          color="primary"
          class="mr-4"
          @click="handleTest"
        >
          测试连接
        </v-btn>
        <v-btn
          @click="handleSubmit"
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
import { ref, reactive } from 'vue'
import type { VForm } from 'vuetify/components'
import { useDockerStore } from '../../stores/dockerStore'
import { DockerService } from '../../services/docker'
import type { DockerHost } from '../../../types/docker'

const dockerService = new DockerService()
const dockerStore = useDockerStore()

const formRef = ref<VForm>()
const form = reactive({
  name: '',
  host: '',
  port: 2375,
  certPath: ''
})

const nameRules = [
  (v: string) => !!v || '请输入主机名称',
  (v: string) => (v && v.length >= 2 && v.length <= 50) || '长度在 2 到 50 个字符'
]

const hostRules = [
  (v: string) => !!v || '请输入主机地址'
]

const portRules = [
  (v: number) => !!v || '请输入Docker端口',
  (v: number) => (v >= 1 && v <= 65535) || '端口范围在1-65535之间'
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

const selectCertPath = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:openFile', {
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      form.certPath = result.filePaths[0]
    }
  } catch (error) {
    showMessage('选择证书目录失败', 'error')
  }
}

const handleTest = async () => {
  try {
    const { valid } = await formRef.value?.validate() || { valid: false }
    if (!valid) return

    const host: DockerHost = {
      id: crypto.randomUUID(),
      name: form.name,
      connectionType: 'tcp',
      status: 'disconnected',
      config: {
        host: form.host,
        port: form.port,
        certPath: form.certPath || undefined
      }
    }

    const isConnected = await dockerService.testTCPConnection(host)
    if (isConnected) {
      showMessage('连接测试成功')
    }
  } catch (error) {
    showMessage(`连接测试失败: ${(error as Error).message}`, 'error')
  }
}

const handleSubmit = async () => {
  try {
    const { valid } = await formRef.value?.validate() || { valid: false }
    if (!valid) return

    const host: Omit<DockerHost, 'id' | 'status'> = {
      name: form.name,
      connectionType: 'tcp',
      config: {
        host: form.host,
        port: form.port,
        certPath: form.certPath || undefined
      }
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
</script>

<style scoped>
.tcp-config-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style> 