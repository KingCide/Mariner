<template>
  <v-dialog
    v-model="visible"
    width="680"
    persistent
    @update:model-value="handleClosed"
  >
    <v-card class="settings-dialog" elevation="0">
      <v-card-title class="px-4 py-3 bg-primary d-flex align-center">
        <span class="text-h6 font-weight-medium text-white">设置</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="visible = false"
        ></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-tabs
          v-model="activeTab"
          color="primary"
          align-tabs="start"
          class="mb-4"
        >
          <v-tab value="general" class="text-body-1">
            <v-icon start size="small">mdi-cog-outline</v-icon>
            常规
          </v-tab>
          <v-tab value="docker" class="text-body-1">
            <v-icon start size="small">mdi-docker</v-icon>
            Docker
          </v-tab>
          <v-tab value="terminal" class="text-body-1">
            <v-icon start size="small">mdi-console</v-icon>
            终端
          </v-tab>
          <v-tab value="proxy" class="text-body-1">
            <v-icon start size="small">mdi-web</v-icon>
            代理
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <!-- 常规设置 -->
          <v-window-item value="general">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <v-form ref="generalFormRef" v-model:valid="generalFormValid">
                <div class="text-subtitle-1 font-weight-medium mb-2">主题</div>
                <v-card-text class="pa-2 bg-white rounded-lg mb-3">
                  <v-btn-toggle
                    v-model="generalForm.theme"
                    mandatory
                    rounded="lg"
                    color="primary"
                    class="d-flex"
                  >
                    <v-btn value="light" class="flex-1">
                      <v-icon start size="small">mdi-white-balance-sunny</v-icon>
                      浅色
                    </v-btn>
                    <v-btn value="dark" class="flex-1">
                      <v-icon start size="small">mdi-moon-waning-crescent</v-icon>
                      深色
                    </v-btn>
                    <v-btn value="system" class="flex-1">
                      <v-icon start size="small">mdi-desktop-mac</v-icon>
                      跟随系统
                    </v-btn>
                  </v-btn-toggle>
                </v-card-text>

                <v-select
                  v-model="generalForm.language"
                  label="语言"
                  :items="[
                    { title: '简体中文', value: 'zh-CN' },
                    { title: 'English', value: 'en-US' }
                  ]"
                  variant="outlined"
                  density="compact"
                  class="rounded-lg mb-3"
                  hide-details
                ></v-select>

                <v-card flat class="rounded-lg pa-3 bg-white">
                  <v-switch
                    v-model="generalForm.autoUpdate"
                    label="自动检查更新"
                    color="primary"
                    hide-details
                    density="compact"
                    class="mb-1"
                  ></v-switch>
                  <v-switch
                    v-model="generalForm.autoStart"
                    label="开机自启"
                    color="primary"
                    hide-details
                    density="compact"
                  ></v-switch>
                </v-card>
              </v-form>
            </v-card>
          </v-window-item>

          <!-- Docker 设置 -->
          <v-window-item value="docker">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <v-form ref="dockerFormRef" v-model:valid="dockerFormValid">
                <v-select
                  v-model="dockerForm.defaultRegistry"
                  label="默认镜像仓库"
                  :items="[
                    { title: 'Docker Hub', value: 'docker.io' },
                    { title: '阿里云', value: 'registry.cn-hangzhou.aliyuncs.com' },
                    { title: '腾讯云', value: 'ccr.ccs.tencentyun.com' }
                  ]"
                  variant="outlined"
                  density="compact"
                  class="rounded-lg mb-3"
                  hide-details
                ></v-select>

                <v-card flat class="rounded-lg pa-3 bg-white mb-3">
                  <div class="text-subtitle-1 font-weight-medium mb-2">镜像拉取策略</div>
                  <v-radio-group 
                    v-model="dockerForm.pullPolicy" 
                    class="ml-2"
                    density="compact"
                    hide-details
                  >
                    <v-radio label="总是拉取" value="always" color="primary"></v-radio>
                    <v-radio label="不存在时拉取" value="ifnotpresent" color="primary"></v-radio>
                    <v-radio label="从不拉取" value="never" color="primary"></v-radio>
                  </v-radio-group>
                </v-card>

                <div class="d-flex gap-3">
                  <v-text-field
                    v-model="dockerForm.logMaxSize"
                    label="容器日志大小"
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    suffix="MB"
                    variant="outlined"
                    density="compact"
                    class="rounded-lg"
                    hide-details
                  ></v-text-field>

                  <v-text-field
                    v-model="dockerForm.logMaxFiles"
                    label="日志文件数量"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    variant="outlined"
                    density="compact"
                    class="rounded-lg"
                    hide-details
                  ></v-text-field>
                </div>
              </v-form>
            </v-card>
          </v-window-item>

          <!-- 终端设置 -->
          <v-window-item value="terminal">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <v-form ref="terminalFormRef" v-model:valid="terminalFormValid">
                <div class="d-flex gap-3 mb-3">
                  <v-select
                    v-model="terminalForm.fontFamily"
                    label="字体"
                    :items="[
                      { title: 'Menlo', value: 'Menlo' },
                      { title: 'Monaco', value: 'Monaco' },
                      { title: 'Consolas', value: 'Consolas' },
                      { title: 'Courier New', value: 'Courier New' }
                    ]"
                    variant="outlined"
                    density="compact"
                    class="rounded-lg"
                    hide-details
                  ></v-select>

                  <v-text-field
                    v-model="terminalForm.fontSize"
                    label="字体大小"
                    type="number"
                    min="8"
                    max="32"
                    step="1"
                    suffix="px"
                    variant="outlined"
                    density="compact"
                    class="rounded-lg"
                    hide-details
                  ></v-text-field>
                </div>

                <div class="d-flex gap-3 mb-3">
                  <v-text-field
                    v-model="terminalForm.lineHeight"
                    label="行高"
                    type="number"
                    min="1"
                    max="2"
                    step="0.1"
                    variant="outlined"
                    density="compact"
                    class="rounded-lg"
                    hide-details
                  ></v-text-field>

                  <v-select
                    v-model="terminalForm.cursorStyle"
                    label="光标样式"
                    :items="[
                      { title: '块状', value: 'block' },
                      { title: '下划线', value: 'underline' },
                      { title: '竖线', value: 'bar' }
                    ]"
                    variant="outlined"
                    density="compact"
                    class="rounded-lg"
                    hide-details
                  ></v-select>
                </div>

                <v-card flat class="rounded-lg pa-3 bg-white">
                  <v-switch
                    v-model="terminalForm.cursorBlink"
                    label="光标闪烁"
                    color="primary"
                    hide-details
                    density="compact"
                  ></v-switch>
                </v-card>
              </v-form>
            </v-card>
          </v-window-item>

          <!-- 代理设置 -->
          <v-window-item value="proxy">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <v-form ref="proxyFormRef" v-model:valid="proxyFormValid">
                <v-card flat class="rounded-lg pa-3 bg-white mb-3">
                  <v-switch
                    v-model="proxyForm.enabled"
                    label="启用代理"
                    color="primary"
                    hide-details
                    density="compact"
                  ></v-switch>
                </v-card>

                <v-expand-transition>
                  <div v-if="proxyForm.enabled" class="d-flex flex-column gap-3">
                    <div class="d-flex gap-3">
                      <v-text-field
                        v-model="proxyForm.host"
                        label="代理服务器"
                        placeholder="例如：127.0.0.1"
                        variant="outlined"
                        density="compact"
                        class="rounded-lg flex-grow-1"
                        hide-details
                      ></v-text-field>

                      <v-text-field
                        v-model="proxyForm.port"
                        label="端口"
                        type="number"
                        min="1"
                        max="65535"
                        step="1"
                        variant="outlined"
                        density="compact"
                        class="rounded-lg"
                        style="width: 120px"
                        hide-details
                      ></v-text-field>
                    </div>

                    <div class="d-flex gap-3">
                      <v-text-field
                        v-model="proxyForm.username"
                        label="用户名"
                        placeholder="可选"
                        variant="outlined"
                        density="compact"
                        class="rounded-lg"
                        hide-details
                      ></v-text-field>

                      <v-text-field
                        v-model="proxyForm.password"
                        label="密码"
                        placeholder="可选"
                        variant="outlined"
                        density="compact"
                        class="rounded-lg"
                        hide-details
                        :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                        @click:append-inner="showPassword = !showPassword"
                        :type="showPassword ? 'text' : 'password'"
                      ></v-text-field>
                    </div>

                    <v-textarea
                      v-model="proxyForm.noProxy"
                      label="不使用代理"
                      placeholder="每行一个地址，支持通配符 *"
                      rows="3"
                      variant="outlined"
                      density="compact"
                      class="rounded-lg"
                      hide-details
                    ></v-textarea>
                  </div>
                </v-expand-transition>
              </v-form>
            </v-card>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="tonal"
          color="primary"
          class="px-6 text-none rounded-lg"
          @click="handleSave"
          :loading="saving"
        >
          保存
        </v-btn>
        <v-btn
          variant="outlined"
          color="default"
          class="px-6 text-none rounded-lg ml-3"
          @click="visible = false"
        >
          取消
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'

const settingsStore = useSettingsStore()
const visible = ref(false)
const activeTab = ref('general')
const saving = ref(false)
const showPassword = ref(false)

// 表单引用
const generalFormRef = ref()
const dockerFormRef = ref()
const terminalFormRef = ref()
const proxyFormRef = ref()

// 表单验证状态
const generalFormValid = ref(true)
const dockerFormValid = ref(true)
const terminalFormValid = ref(true)
const proxyFormValid = ref(true)

// 表单数据
const generalForm = reactive({
  theme: 'system' as 'system' | 'light' | 'dark',
  language: 'zh-CN',
  autoUpdate: true,
  autoStart: false
})

const dockerForm = reactive({
  defaultRegistry: 'docker.io',
  pullPolicy: 'ifnotpresent' as 'ifnotpresent' | 'always' | 'never',
  logMaxSize: 100,
  logMaxFiles: 3
})

const terminalForm = reactive({
  fontFamily: 'Menlo',
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: 'block' as 'block' | 'underline' | 'bar',
  cursorBlink: true
})

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
const handleClosed = (val: boolean) => {
  if (!val) {
    activeTab.value = 'general'
    generalFormRef.value?.reset()
    dockerFormRef.value?.reset()
    terminalFormRef.value?.reset()
    proxyFormRef.value?.reset()
  }
}

// 保存设置
const handleSave = async () => {
  saving.value = true
  try {
    await settingsStore.saveSettings({
      general: { ...generalForm },
      docker: { ...dockerForm },
      terminal: { ...terminalForm },
      proxy: { ...proxyForm }
    })
    visible.value = false
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    saving.value = false
  }
}

defineExpose({
  open
})
</script>

<style scoped>
.settings-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.flex-1 {
  flex: 1;
}

:deep(.v-field) {
  border-radius: 8px !important;
}

:deep(.v-input) {
  --v-input-control-height: 40px;
}

:deep(.v-btn) {
  text-transform: none;
  letter-spacing: normal;
}

.gap-3 {
  gap: 12px;
}
</style> 