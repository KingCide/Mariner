<template>
  <v-form
    ref="formRef"
    v-model="valid"
    class="ssh-config-form"
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
          placeholder="请自定义主机名称"
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

      <!-- 端口和用户名 -->
      <v-col cols="12" sm="6">
        <v-text-field
          v-model.number="form.port"
          label="SSH端口"
          type="number"
          variant="outlined"
          density="compact"
          hint="默认为22"
          :rules="portRules"
        ></v-text-field>
      </v-col>

      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.username"
          label="用户名"
          variant="outlined"
          density="compact"
          :rules="usernameRules"
          placeholder="请输入SSH用户名"
        ></v-text-field>
      </v-col>

      <!-- 认证方式选择 -->
      <v-col cols="12">
        <v-radio-group
          v-model="form.authType"
          inline
          density="compact"
        >
          <v-radio value="password" label="密码"></v-radio>  
          <v-radio value="privateKey" label="私钥"></v-radio>
        </v-radio-group>
      </v-col>

      <!-- 私钥认证相关字段 -->
      <template v-if="form.authType === 'privateKey'">
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.privateKeyPath"
            label="私钥文件"
            variant="outlined"
            density="compact"
            readonly
            append-inner-icon="mdi-folder"
            @click:append-inner="selectPrivateKey"
            :rules="privateKeyRules"
          ></v-text-field>
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.passphrase"
            label="密码短语"
            variant="outlined"
            density="compact"
            placeholder="私钥有密码保护时输入"
            :type="showPassphrase ? 'text' : 'password'"
            :append-inner-icon="showPassphrase ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassphrase = !showPassphrase"
          ></v-text-field>
        </v-col>
      </template>

      <!-- 密码认证相关字段 -->
      <template v-else>
        <v-col cols="12">
          <v-text-field
            v-model="form.password"
            label="密码"
            variant="outlined"
            density="compact"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            :rules="passwordRules"
          ></v-text-field>
        </v-col>
      </template>

      <!-- Docker端口 -->
      <v-col cols="12" sm="6">
        <v-text-field
          v-model.number="form.dockerPort"
          label="Docker端口"
          type="number"
          variant="outlined"
          density="compact"
          hint="默认为2375"
          :rules="dockerPortRules"
        ></v-text-field>
      </v-col>

      <!-- 操作按钮 -->
      <v-col cols="12" class="d-flex justify-end">
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
  port: 22,
  username: '',
  authType: 'password',
  privateKey: '',
  privateKeyPath: '',
  passphrase: '',
  password: '',
  dockerPort: 2375
})

// 删除 FormRules 类型声明，直接定义验证规则
const nameRules = [
  (v: string) => !!v || '请输入主机名称',
  (v: string) => (v && v.length >= 2 && v.length <= 50) || '长度在 2 到 50 个字符'
]

const hostRules = [
  (v: string) => !!v || '请输入主机地址'
]

const portRules = [
  (v: number) => !!v || '请输入端口号',
  (v: number) => (v >= 1 && v <= 65535) || '端口范围在1-65535之间'
]

const usernameRules = [
  (v: string) => !!v || '请输入用户名'
]

const privateKeyRules = [
  (v: string) => !!v || '请选择私钥文件'
]

const passwordRules = [
  (v: string) => !!v || '请输入密码'
]

const dockerPortRules = [
  (v: number) => !!v || '请输入Docker端口',
  (v: number) => (v >= 1 && v <= 65535) || '端口范围在1-65535之间'
]

const selectPrivateKey = async () => {
  try {
    // 使用Electron的dialog API选择文件
    const result = await window.electron.ipcRenderer.invoke('dialog:openFile', {
      properties: ['openFile'],
      filters: [
        { name: 'SSH Private Key', extensions: ['pem', 'key', 'ppk'] }
      ]
    })

    if (result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      form.privateKeyPath = filePath
      // 读取私钥文件内容
      const privateKey = await window.electron.ipcRenderer.invoke('fs:readFile', filePath)
      form.privateKey = privateKey
    }
  } catch (error) {
    showMessage('选择私钥文件失败')
  }
}

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

const handleTest = async () => {
  try {
    const { valid } = await formRef.value?.validate() || { valid: false }
    if (!valid) return
    
    const host: DockerHost = {
      id: '', // 临时ID，实际保存时会生成
      name: form.name,
      connectionType: 'ssh',
      status: 'disconnected',
      config: {
        host: form.host,
        port: form.port,
        sshConfig: {
          username: form.username,
          ...(form.authType === 'privateKey' 
            ? {
                privateKey: form.privateKey,
                passphrase: form.passphrase
              }
            : {
                password: form.password
              }
          )
        }
      }
    }

    const isConnected = await dockerService.testSSHConnection(host)
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
      connectionType: 'ssh',
      config: {
        host: form.host,
        port: form.port,
        sshConfig: {
          username: form.username,
          ...(form.authType === 'privateKey' 
            ? {
                privateKey: form.privateKey,
                passphrase: form.passphrase
              }
            : {
                password: form.password
              }
          )
        }
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
const showPassword = ref(false)
const showPassphrase = ref(false)
</script>

<style scoped>
.ssh-config-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style> 