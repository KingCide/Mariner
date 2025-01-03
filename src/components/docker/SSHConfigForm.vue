<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    class="ssh-config-form"
  >
    <el-form-item label="主机名称" prop="name">
      <el-input v-model="form.name" placeholder="请输入主机名称" />
    </el-form-item>

    <el-form-item label="主机地址" prop="host">
      <el-input v-model="form.host" placeholder="请输入主机IP或域名" />
    </el-form-item>

    <el-form-item label="SSH端口" prop="port">
      <el-input-number v-model="form.port" :min="1" :max="65535" :step="1" />
    </el-form-item>

    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" placeholder="请输入SSH用户名" />
    </el-form-item>

    <el-form-item label="认证方式" prop="authType">
      <el-radio-group v-model="form.authType">
        <el-radio label="privateKey">私钥</el-radio>
        <el-radio label="password">密码</el-radio>
      </el-radio-group>
    </el-form-item>

    <template v-if="form.authType === 'privateKey'">
      <el-form-item label="私钥文件" prop="privateKey">
        <div class="private-key-input">
          <el-input
            v-model="form.privateKeyPath"
            placeholder="请选择私钥文件"
            readonly
          >
            <template #append>
              <el-button @click="selectPrivateKey">选择文件</el-button>
            </template>
          </el-input>
        </div>
      </el-form-item>

      <el-form-item label="密码短语" prop="passphrase">
        <el-input
          v-model="form.passphrase"
          type="password"
          placeholder="如果私钥有密码保护，请输入密码短语"
          show-password
        />
      </el-form-item>
    </template>

    <template v-else>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="请输入SSH密码"
          show-password
        />
      </el-form-item>
    </template>

    <el-form-item label="Docker端口" prop="dockerPort">
      <el-input-number
        v-model="form.dockerPort"
        :min="1"
        :max="65535"
        :step="1"
      />
      <div class="form-tip">
        远程Docker守护进程的端口，默认为2375
      </div>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleTest">测试连接</el-button>
      <el-button @click="handleSubmit">保存</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useDockerStore } from '../../stores/dockerStore'
import { DockerService } from '../../services/docker'
import type { DockerHost } from '../../../types/docker'

const dockerService = new DockerService()
const dockerStore = useDockerStore()

const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  host: '',
  port: 22,
  username: '',
  authType: 'privateKey',
  privateKey: '',
  privateKeyPath: '',
  passphrase: '',
  password: '',
  dockerPort: 2375
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入主机名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入SSH端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围在1-65535之间', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  privateKey: [
    { required: true, message: '请选择私钥文件', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  dockerPort: [
    { required: true, message: '请输入Docker端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围在1-65535之间', trigger: 'blur' }
  ]
}

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
    ElMessage.error('选择私钥文件失败')
  }
}

const handleTest = async () => {
  try {
    const valid = await formRef.value?.validate()
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
      ElMessage.success('连接测试成功')
    }
  } catch (error) {
    ElMessage.error(`连接测试失败: ${(error as Error).message}`)
  }
}

const handleSubmit = async () => {
  try {
    const valid = await formRef.value?.validate()
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
    ElMessage.success('保存成功')
    emit('saved')
  } catch (error) {
    ElMessage.error(`保存失败: ${(error as Error).message}`)
  }
}

const emit = defineEmits<{
  (event: 'saved'): void
}>()
</script>

<style scoped>
.ssh-config-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.private-key-input {
  display: flex;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style> 