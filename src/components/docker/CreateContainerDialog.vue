<template>
  <el-dialog
    v-model="visible"
    title="创建容器"
    width="800px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="create-container-form"
    >
      <el-form-item label="容器名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入容器名称" />
      </el-form-item>

      <el-form-item label="镜像" prop="image">
        <el-select
          v-model="form.image"
          placeholder="请选择镜像"
          filterable
          remote
          :remote-method="handleSearchImage"
          :loading="imageSearchLoading"
          class="image-select"
        >
          <el-option-group label="本地镜像">
            <el-option
              v-for="image in localImages"
              :key="image.id"
              :label="image.name"
              :value="image.name"
            />
          </el-option-group>
          <el-option-group v-if="remoteImages.length" label="远程镜像">
            <el-option
              v-for="image in remoteImages"
              :key="image.name"
              :label="image.name"
              :value="image.name"
            />
          </el-option-group>
        </el-select>
      </el-form-item>

      <el-form-item label="端口映射">
        <div v-for="(port, index) in form.ports" :key="index" class="port-mapping">
          <el-input-number
            v-model="port.hostPort"
            :min="1"
            :max="65535"
            placeholder="主机端口"
            class="port-input"
          />
          <span class="port-separator">:</span>
          <el-input-number
            v-model="port.containerPort"
            :min="1"
            :max="65535"
            placeholder="容器端口"
            class="port-input"
          />
          <el-select v-model="port.protocol" class="protocol-select">
            <el-option label="TCP" value="tcp" />
            <el-option label="UDP" value="udp" />
          </el-select>
          <el-button
            type="danger"
            circle
            :icon="Delete"
            @click="removePort(index)"
          />
        </div>
        <el-button type="primary" plain @click="addPort">
          <el-icon><Plus /></el-icon>
          添加端口映射
        </el-button>
      </el-form-item>

      <el-form-item label="环境变量">
        <div v-for="(env, index) in form.env" :key="index" class="env-variable">
          <el-input
            v-model="env.key"
            placeholder="变量名"
            class="env-input"
          />
          <span class="env-separator">=</span>
          <el-input
            v-model="env.value"
            placeholder="变量值"
            class="env-input"
          />
          <el-button
            type="danger"
            circle
            :icon="Delete"
            @click="removeEnv(index)"
          />
        </div>
        <el-button type="primary" plain @click="addEnv">
          <el-icon><Plus /></el-icon>
          添加环境变量
        </el-button>
      </el-form-item>

      <el-form-item label="数据卷">
        <div v-for="(volume, index) in form.volumes" :key="index" class="volume-mapping">
          <el-input
            v-model="volume.host"
            placeholder="主机路径"
            class="volume-input"
          >
            <template #append>
              <el-button @click="selectHostPath(index)">选择</el-button>
            </template>
          </el-input>
          <span class="volume-separator">:</span>
          <el-input
            v-model="volume.container"
            placeholder="容器路径"
            class="volume-input"
          />
          <el-select v-model="volume.mode" class="mode-select">
            <el-option label="读写" value="rw" />
            <el-option label="只读" value="ro" />
          </el-select>
          <el-button
            type="danger"
            circle
            :icon="Delete"
            @click="removeVolume(index)"
          />
        </div>
        <el-button type="primary" plain @click="addVolume">
          <el-icon><Plus /></el-icon>
          添加数据卷
        </el-button>
      </el-form-item>

      <el-form-item label="重启策略">
        <el-select v-model="form.restartPolicy" class="restart-select">
          <el-option label="不自动重启" value="no" />
          <el-option label="异常时重启" value="on-failure" />
          <el-option label="总是重启" value="always" />
          <el-option label="除非手动停止" value="unless-stopped" />
        </el-select>
      </el-form-item>

      <el-form-item label="资源限制">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="CPU 限制" prop="cpuLimit">
              <el-input-number
                v-model="form.cpuLimit"
                :min="0.1"
                :max="32"
                :step="0.1"
                :precision="1"
                class="resource-input"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="内存限制" prop="memoryLimit">
              <el-input-number
                v-model="form.memoryLimit"
                :min="4"
                :max="128"
                :step="1"
                class="resource-input"
              />
              <span class="unit">GB</span>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="creating"
        @click="handleCreate"
      >
        创建
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { useDockerStore } from '../../stores/dockerStore'
import type { FormInstance, FormRules } from 'element-plus'
import type { DockerImage } from '../../../types/docker'

const dockerStore = useDockerStore()
const visible = ref(false)
const creating = ref(false)
const imageSearchLoading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const form = reactive({
  name: '',
  image: '',
  ports: [] as Array<{
    hostPort: number
    containerPort: number
    protocol: 'tcp' | 'udp'
  }>,
  env: [] as Array<{
    key: string
    value: string
  }>,
  volumes: [] as Array<{
    host: string
    container: string
    mode: 'rw' | 'ro'
  }>,
  restartPolicy: 'no',
  cpuLimit: 1,
  memoryLimit: 4
})

// 表单验证规则
const rules = reactive<FormRules>({
  name: [
    { required: true, message: '请输入容器名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, message: '容器名称只能包含字母、数字、下划线、点和横线', trigger: 'blur' }
  ],
  image: [
    { required: true, message: '请选择镜像', trigger: 'change' }
  ]
})

// 本地镜像列表
const localImages = ref<DockerImage[]>([])
// 远程镜像搜索结果
const remoteImages = ref<DockerImage[]>([])

// 打开对话框
const open = async () => {
  visible.value = true
  // 加载本地镜像列表
  try {
    await dockerStore.refreshImages()
    localImages.value = dockerStore.images
  } catch (error) {
    console.error('Failed to load local images:', error)
    ElMessage.error('加载本地镜像失败')
  }
}

// 关闭对话框时重置表单
const handleClosed = () => {
  formRef.value?.resetFields()
  form.ports = []
  form.env = []
  form.volumes = []
  form.restartPolicy = 'no'
  form.cpuLimit = 1
  form.memoryLimit = 4
  remoteImages.value = []
}

// 搜索远程镜像
const handleSearchImage = async (query: string) => {
  if (!query) {
    remoteImages.value = []
    return
  }

  imageSearchLoading.value = true
  try {
    const results = await dockerStore.searchImages(query)
    remoteImages.value = results
  } catch (error) {
    console.error('Failed to search images:', error)
    ElMessage.error('搜索镜像失败')
  } finally {
    imageSearchLoading.value = false
  }
}

// 添加端口映射
const addPort = () => {
  form.ports.push({
    hostPort: 0,
    containerPort: 0,
    protocol: 'tcp'
  })
}

// 移除端口映射
const removePort = (index: number) => {
  form.ports.splice(index, 1)
}

// 添加环境变量
const addEnv = () => {
  form.env.push({
    key: '',
    value: ''
  })
}

// 移除环境变量
const removeEnv = (index: number) => {
  form.env.splice(index, 1)
}

// 添加数据卷
const addVolume = () => {
  form.volumes.push({
    host: '',
    container: '',
    mode: 'rw'
  })
}

// 移除数据卷
const removeVolume = (index: number) => {
  form.volumes.splice(index, 1)
}

// 选择主机路径
const selectHostPath = async (index: number) => {
  try {
    const path = await dockerStore.selectHostPath()
    if (path) {
      form.volumes[index].host = path
    }
  } catch (error) {
    console.error('Failed to select host path:', error)
    ElMessage.error('选择路径失败')
  }
}

// 创建容器
const handleCreate = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  creating.value = true
  try {
    await dockerStore.createContainer({
      name: form.name,
      image: form.image,
      ports: form.ports,
      env: form.env.reduce((acc, curr) => {
        acc[curr.key] = curr.value
        return acc
      }, {} as Record<string, string>),
      volumes: form.volumes,
      restartPolicy: form.restartPolicy,
      cpuLimit: form.cpuLimit,
      memoryLimit: form.memoryLimit * 1024 * 1024 * 1024 // 转换为字节
    })

    ElMessage.success('容器创建成功')
    visible.value = false
    emit('created')
  } catch (error) {
    console.error('Failed to create container:', error)
    ElMessage.error('创建容器失败')
  } finally {
    creating.value = false
  }
}

// 定义组件事件
const emit = defineEmits<{
  (event: 'created'): void
}>()

// 暴露组件方法
defineExpose({
  open
})
</script>

<style scoped>
.create-container-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 16px;
}

.image-select {
  width: 100%;
}

.port-mapping,
.env-variable,
.volume-mapping {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.port-input {
  width: 120px;
}

.port-separator,
.env-separator,
.volume-separator {
  color: #909399;
}

.protocol-select {
  width: 100px;
}

.env-input {
  flex: 1;
}

.volume-input {
  flex: 1;
}

.mode-select {
  width: 100px;
}

.restart-select {
  width: 200px;
}

.resource-input {
  width: 120px;
}

.unit {
  margin-left: 8px;
  color: #909399;
}
</style> 