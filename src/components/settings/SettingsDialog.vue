<template>
  <el-dialog
    v-model="visible"
    title="设置"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-tabs v-model="activeTab">
      <!-- 常规设置 -->
      <el-tab-pane label="常规" name="general">
        <el-form
          ref="generalFormRef"
          :model="generalForm"
          label-width="120px"
        >
          <el-form-item label="主题">
            <el-radio-group v-model="generalForm.theme">
              <el-radio-button label="light">浅色</el-radio-button>
              <el-radio-button label="dark">深色</el-radio-button>
              <el-radio-button label="system">跟随系统</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="语言">
            <el-select v-model="generalForm.language">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="English" value="en-US" />
            </el-select>
          </el-form-item>

          <el-form-item label="自动检查更新">
            <el-switch v-model="generalForm.autoUpdate" />
          </el-form-item>

          <el-form-item label="开机自启">
            <el-switch v-model="generalForm.autoStart" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- Docker 设置 -->
      <el-tab-pane label="Docker" name="docker">
        <el-form
          ref="dockerFormRef"
          :model="dockerForm"
          label-width="120px"
        >
          <el-form-item label="默认镜像仓库">
            <el-select v-model="dockerForm.defaultRegistry">
              <el-option label="Docker Hub" value="docker.io" />
              <el-option label="阿里云" value="registry.cn-hangzhou.aliyuncs.com" />
              <el-option label="腾讯云" value="ccr.ccs.tencentyun.com" />
            </el-select>
          </el-form-item>

          <el-form-item label="镜像拉取策略">
            <el-radio-group v-model="dockerForm.pullPolicy">
              <el-radio label="always">总是拉取</el-radio>
              <el-radio label="ifnotpresent">不存在时拉取</el-radio>
              <el-radio label="never">从不拉取</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="容器日志大小">
            <el-input-number
              v-model="dockerForm.logMaxSize"
              :min="10"
              :max="1000"
              :step="10"
            />
            <span class="unit">MB</span>
          </el-form-item>

          <el-form-item label="日志文件数量">
            <el-input-number
              v-model="dockerForm.logMaxFiles"
              :min="1"
              :max="100"
              :step="1"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 终端设置 -->
      <el-tab-pane label="终端" name="terminal">
        <el-form
          ref="terminalFormRef"
          :model="terminalForm"
          label-width="120px"
        >
          <el-form-item label="字体">
            <el-select v-model="terminalForm.fontFamily">
              <el-option label="Menlo" value="Menlo" />
              <el-option label="Monaco" value="Monaco" />
              <el-option label="Consolas" value="Consolas" />
              <el-option label="Courier New" value="Courier New" />
            </el-select>
          </el-form-item>

          <el-form-item label="字体大小">
            <el-input-number
              v-model="terminalForm.fontSize"
              :min="8"
              :max="32"
              :step="1"
            />
            <span class="unit">px</span>
          </el-form-item>

          <el-form-item label="行高">
            <el-input-number
              v-model="terminalForm.lineHeight"
              :min="1"
              :max="2"
              :step="0.1"
              :precision="1"
            />
          </el-form-item>

          <el-form-item label="光标样式">
            <el-select v-model="terminalForm.cursorStyle">
              <el-option label="块状" value="block" />
              <el-option label="下划线" value="underline" />
              <el-option label="竖线" value="bar" />
            </el-select>
          </el-form-item>

          <el-form-item label="光标闪烁">
            <el-switch v-model="terminalForm.cursorBlink" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 代理设置 -->
      <el-tab-pane label="代理" name="proxy">
        <el-form
          ref="proxyFormRef"
          :model="proxyForm"
          label-width="120px"
        >
          <el-form-item label="启用代理">
            <el-switch v-model="proxyForm.enabled" />
          </el-form-item>

          <template v-if="proxyForm.enabled">
            <el-form-item label="代理服务器">
              <el-input v-model="proxyForm.host" placeholder="例如：127.0.0.1" />
            </el-form-item>

            <el-form-item label="端口">
              <el-input-number
                v-model="proxyForm.port"
                :min="1"
                :max="65535"
                :step="1"
                class="port-input"
              />
            </el-form-item>

            <el-form-item label="用户名">
              <el-input v-model="proxyForm.username" placeholder="可选" />
            </el-form-item>

            <el-form-item label="密码">
              <el-input
                v-model="proxyForm.password"
                type="password"
                placeholder="可选"
                show-password
              />
            </el-form-item>

            <el-form-item label="不使用代理">
              <el-input
                v-model="proxyForm.noProxy"
                type="textarea"
                :rows="3"
                placeholder="每行一个地址，支持通配符 *"
              />
            </el-form-item>
          </template>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '../../stores/settingsStore'

const settingsStore = useSettingsStore()
const visible = ref(false)
const activeTab = ref('general')

// 常规设置表单
const generalForm = reactive({
  theme: 'system',
  language: 'zh-CN',
  autoUpdate: true,
  autoStart: false
})

// Docker 设置表单
const dockerForm = reactive({
  defaultRegistry: 'docker.io',
  pullPolicy: 'ifnotpresent',
  logMaxSize: 100,
  logMaxFiles: 3
})

// 终端设置表单
const terminalForm = reactive({
  fontFamily: 'Menlo',
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: 'block',
  cursorBlink: true
})

// 代理设置表单
const proxyForm = reactive({
  enabled: false,
  host: '',
  port: 1080,
  username: '',
  password: '',
  noProxy: ''
})

// 打开对话框
const open = () => {
  visible.value = true
  // 加载设置
  const settings = settingsStore.settings
  Object.assign(generalForm, settings.general)
  Object.assign(dockerForm, settings.docker)
  Object.assign(terminalForm, settings.terminal)
  Object.assign(proxyForm, settings.proxy)
}

// 关闭对话框时重置表单
const handleClosed = () => {
  activeTab.value = 'general'
}

// 保存设置
const handleSave = async () => {
  try {
    await settingsStore.saveSettings({
      general: { ...generalForm },
      docker: { ...dockerForm },
      terminal: { ...terminalForm },
      proxy: { ...proxyForm }
    })
    ElMessage.success('设置已保存')
    visible.value = false
  } catch (error) {
    console.error('Failed to save settings:', error)
    ElMessage.error('保存设置失败')
  }
}

// 暴露组件方法
defineExpose({
  open
})
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: #909399;
}

.port-input {
  width: 120px;
}
</style> 