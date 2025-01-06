<template>
  <v-dialog
    v-model="visible"
    width="680"
    persistent
    @update:model-value="handleClose"
  >
    <v-card class="settings-dialog" elevation="0">
      <v-card-title class="px-4 py-3 bg-primary d-flex align-center">
        <span class="text-h6 font-weight-medium text-white">{{ $t('settings.title') }}</span>
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
            {{ $t('settings.general.title') }}
          </v-tab>
          <v-tab value="docker" class="text-body-1">
            <v-icon start size="small">mdi-docker</v-icon>
            Docker
          </v-tab>
          <v-tab value="terminal" class="text-body-1">
            <v-icon start size="small">mdi-console</v-icon>
            {{ $t('settings.terminal.title') }}
          </v-tab>
          <v-tab value="proxy" class="text-body-1">
            <v-icon start size="small">mdi-web</v-icon>
            {{ $t('settings.proxy.title') }}
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <!-- 常规设置 -->
          <v-window-item value="general">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <v-form ref="generalFormRef">
                <div class="text-subtitle-1 font-weight-medium mb-2">{{ $t('settings.general.theme') }}</div>
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
                      {{ $t('settings.general.light') }}
                    </v-btn>
                    <v-btn value="dark" class="flex-1">
                      <v-icon start size="small">mdi-moon-waning-crescent</v-icon>
                      {{ $t('settings.general.dark') }}
                    </v-btn>
                    <v-btn value="system" class="flex-1">
                      <v-icon start size="small">mdi-desktop-mac</v-icon>
                      {{ $t('settings.general.system') }}
                    </v-btn>
                  </v-btn-toggle>
                </v-card-text>

                <v-select
                  v-model="generalForm.language"
                  :label="$t('settings.general.language')"
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
                    :label="$t('settings.general.autoUpdate')"
                    color="primary"
                    hide-details
                    density="compact"
                    class="mb-1"
                  ></v-switch>
                  <v-switch
                    v-model="generalForm.autoStart"
                    :label="$t('settings.general.autoStart')"
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
              <v-form ref="dockerFormRef">
                <v-select
                  v-model="dockerForm.defaultRegistry"
                  :label="$t('settings.docker.registry')"
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
                  <div class="text-subtitle-1 font-weight-medium mb-2">{{ $t('settings.docker.pullPolicy') }}</div>
                  <v-radio-group 
                    v-model="dockerForm.pullPolicy" 
                    class="ml-2"
                    density="compact"
                    hide-details
                  >
                    <v-radio :label="$t('settings.docker.always')" value="always" color="primary"></v-radio>
                    <v-radio :label="$t('settings.docker.ifnotpresent')" value="ifnotpresent" color="primary"></v-radio>
                    <v-radio :label="$t('settings.docker.never')" value="never" color="primary"></v-radio>
                  </v-radio-group>
                </v-card>

                <div class="d-flex gap-3">
                  <v-text-field
                    v-model="dockerForm.logMaxSize"
                    :label="$t('settings.docker.logMaxSize')"
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
                    :label="$t('settings.docker.logMaxFiles')"
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
              <v-form ref="terminalFormRef">
                <div class="d-flex gap-3 mb-3">
                  <v-select
                    v-model="terminalForm.fontFamily"
                    :label="$t('settings.terminal.fontFamily')"
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
                    :label="$t('settings.terminal.fontSize')"
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
                    :label="$t('settings.terminal.lineHeight')"
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
                    :label="$t('settings.terminal.cursorStyle')"
                    :items="[
                      { title: $t('settings.terminal.block'), value: 'block' },
                      { title: $t('settings.terminal.underline'), value: 'underline' },
                      { title: $t('settings.terminal.bar'), value: 'bar' }
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
                    :label="$t('settings.terminal.cursorBlink')"
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
              <v-form ref="proxyFormRef">
                <v-card flat class="rounded-lg pa-3 bg-white mb-3">
                  <v-switch
                    v-model="proxyForm.enabled"
                    :label="$t('settings.proxy.enabled')"
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
                        :label="$t('settings.proxy.host')"
                        :placeholder="$t('settings.proxy.hostPlaceholder')"
                        variant="outlined"
                        density="compact"
                        class="rounded-lg flex-grow-1"
                        hide-details
                      ></v-text-field>

                      <v-text-field
                        v-model="proxyForm.port"
                        :label="$t('settings.proxy.port')"
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
                        :label="$t('settings.proxy.username')"
                        :placeholder="$t('settings.proxy.usernamePlaceholder')"
                        variant="outlined"
                        density="compact"
                        class="rounded-lg"
                        hide-details
                      ></v-text-field>

                      <v-text-field
                        v-model="proxyForm.password"
                        :label="$t('settings.proxy.password')"
                        :placeholder="$t('settings.proxy.passwordPlaceholder')"
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
                      :label="$t('settings.proxy.noProxy')"
                      :placeholder="$t('settings.proxy.noProxyPlaceholder')"
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

      <v-card-actions class="pa-4 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="visible = false"
        >
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          @click="handleSave"
        >
          {{ $t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settingsStore'

const visible = ref(false)
const activeTab = ref('general')
const saving = ref(false)
const showPassword = ref(false)

const theme = useTheme()
const { locale } = useI18n()
const settingsStore = useSettingsStore()

// 表单数据
const generalForm = ref({
  theme: 'light' as 'light' | 'dark' | 'system',
  language: 'zh-CN',
  autoUpdate: true,
  autoStart: false
})

const dockerForm = ref({
  defaultRegistry: 'docker.io',
  pullPolicy: 'ifnotpresent' as 'ifnotpresent' | 'always' | 'never',
  logMaxSize: 100,
  logMaxFiles: 3
})

const terminalForm = ref({
  fontFamily: 'Menlo',
  fontSize: 14,
  lineHeight: 1.2,
  cursorStyle: 'block' as 'block' | 'underline' | 'bar',
  cursorBlink: true
})

const proxyForm = ref({
  enabled: false,
  host: '',
  port: 1080,
  username: '',
  password: '',
  noProxy: ''
})

// 监听主题变化
watch(() => generalForm.value.theme, (newTheme) => {
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    theme.global.name.value = prefersDark ? 'dark' : 'light'
  } else {
    theme.global.name.value = newTheme
  }
})

// 监听语言变化
watch(() => generalForm.value.language, (newLanguage) => {
  locale.value = newLanguage
})

// 监听系统主题变化
onMounted(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (e: MediaQueryListEvent) => {
    if (generalForm.value.theme === 'system') {
      theme.global.name.value = e.matches ? 'dark' : 'light'
    }
  }
  mediaQuery.addEventListener('change', handleChange)
  onUnmounted(() => {
    mediaQuery.removeEventListener('change', handleChange)
  })
})

// 关闭对话框时重置表单
const handleClose = (val: boolean) => {
  if (!val) {
    activeTab.value = 'general'
    // 重置表单数据
    const settings = settingsStore.settings
    Object.assign(generalForm.value, settings.general)
    Object.assign(dockerForm.value, settings.docker)
    Object.assign(terminalForm.value, settings.terminal)
    Object.assign(proxyForm.value, settings.proxy)
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await settingsStore.saveSettings({
      general: { ...generalForm.value },
      docker: { ...dockerForm.value },
      terminal: { ...terminalForm.value },
      proxy: { ...proxyForm.value }
    })
    // 应用主题和语言设置
    if (generalForm.value.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.global.name.value = prefersDark ? 'dark' : 'light'
    } else {
      theme.global.name.value = generalForm.value.theme
    }
    locale.value = generalForm.value.language
    visible.value = false
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    saving.value = false
  }
}

defineExpose({
  show: () => {
    visible.value = true
    // 加载设置
    const settings = settingsStore.settings
    Object.assign(generalForm.value, settings.general)
    Object.assign(dockerForm.value, settings.docker)
    Object.assign(terminalForm.value, settings.terminal)
    Object.assign(proxyForm.value, settings.proxy)
  }
})
</script>

<style scoped>
.flex-1 {
  flex: 1;
}
</style> 