<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    class="tcp-config-form"
  >
    <el-form-item label="主机名称" prop="name">
      <el-input v-model="form.name" placeholder="请输入主机名称" />
    </el-form-item>

    <el-form-item label="主机地址" prop="host">
      <el-input v-model="form.host" placeholder="请输入主机IP或域名" />
    </el-form-item>

    <el-form-item label="Docker端口" prop="port">
      <el-input-number v-model="form.port" :min="1" :max="65535" :step="1" />
      <div class="form-tip">
        远程Docker守护进程的端口，默认为2375
      </div>
    </el-form-item>

    <el-form-item label="TLS证书">
      <el-input v-model="form.certPath" placeholder="证书目录路径（可选）">
        <template #append>
          <el-button @click="selectCertPath">选择</el-button>
        </template>
      </el-input>
      <div class="form-tip">
        如果启用了 TLS，请选择包含 ca.pem、cert.pem 和 key.pem 的目录
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
  port: 2375,
  certPath: ''
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
    { required: true, message: '请输入Docker端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围在1-65535之间', trigger: 'blur' }
  ]
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
    ElMessage.error('选择证书目录失败')
  }
}

const handleTest = async () => {
  try {
    const valid = await formRef.value?.validate()
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
      ElMessage.success('连接测试成功')
    } else {
      ElMessage.error('连接测试失败')
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
      connectionType: 'tcp',
      config: {
        host: form.host,
        port: form.port,
        certPath: form.certPath || undefined
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
.tcp-config-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style> 