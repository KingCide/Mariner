import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Settings {
  general: {
    theme: 'light' | 'dark' | 'system'
    language: string
    autoUpdate: boolean
    autoStart: boolean
  }
  docker: {
    defaultRegistry: string
    pullPolicy: 'always' | 'ifnotpresent' | 'never'
    logMaxSize: number
    logMaxFiles: number
  }
  terminal: {
    fontFamily: string
    fontSize: number
    lineHeight: number
    cursorStyle: 'block' | 'underline' | 'bar'
    cursorBlink: boolean
  }
  proxy: {
    enabled: boolean
    host: string
    port: number
    username: string
    password: string
    noProxy: string
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // 默认设置
  const defaultSettings: Settings = {
    general: {
      theme: 'system',
      language: 'zh-CN',
      autoUpdate: true,
      autoStart: false
    },
    docker: {
      defaultRegistry: 'docker.io',
      pullPolicy: 'ifnotpresent',
      logMaxSize: 100,
      logMaxFiles: 3
    },
    terminal: {
      fontFamily: 'Menlo',
      fontSize: 14,
      lineHeight: 1.2,
      cursorStyle: 'block',
      cursorBlink: true
    },
    proxy: {
      enabled: false,
      host: '',
      port: 1080,
      username: '',
      password: '',
      noProxy: ''
    }
  }

  // 当前设置
  const settings = ref<Settings>({ ...defaultSettings })

  // 加载设置
  const loadSettings = async () => {
    try {
      const savedSettings = await window.electron.ipcRenderer.invoke('settings:load')
      if (savedSettings) {
        settings.value = {
          ...defaultSettings,
          ...savedSettings
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      settings.value = { ...defaultSettings }
    }
  }

  // 保存设置
  const saveSettings = async (newSettings: Settings) => {
    try {
      await window.electron.ipcRenderer.invoke('settings:save', newSettings)
      settings.value = newSettings

      // 应用主题
      applyTheme(newSettings.general.theme)

      // 应用语言
      applyLanguage(newSettings.general.language)

      // 应用代理
      if (newSettings.proxy.enabled) {
        applyProxy(newSettings.proxy)
      } else {
        clearProxy()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  // 应用主题
  const applyTheme = (theme: string) => {
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }

  // 应用语言
  const applyLanguage = (language: string) => {
    document.documentElement.setAttribute('lang', language)
  }

  // 应用代理
  const applyProxy = (proxy: Settings['proxy']) => {
    window.electron.ipcRenderer.send('settings:setProxy', proxy)
  }

  // 清除代理
  const clearProxy = () => {
    window.electron.ipcRenderer.send('settings:clearProxy')
  }

  // 重置设置
  const resetSettings = async () => {
    await saveSettings({ ...defaultSettings })
  }

  // 初始化
  loadSettings()

  return {
    settings,
    loadSettings,
    saveSettings,
    resetSettings
  }
}) 