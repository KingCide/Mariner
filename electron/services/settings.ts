import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

export class SettingsService {
  private settingsPath: string

  constructor() {
    this.settingsPath = join(app.getPath('userData'), 'settings.json')
  }

  // 加载设置
  async loadSettings(): Promise<any> {
    try {
      const data = await readFile(this.settingsPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // 如果文件不存在或解析失败，返回 null
      return null
    }
  }

  // 保存设置
  async saveSettings(settings: any): Promise<void> {
    try {
      await writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  // 设置代理
  setProxy(config: {
    host: string
    port: number
    username?: string
    password?: string
    noProxy?: string
  }): void {
    const { host, port, username, password, noProxy } = config
    let proxyUrl = `http://${host}:${port}`

    if (username && password) {
      proxyUrl = `http://${username}:${password}@${host}:${port}`
    }

    app.commandLine.appendSwitch('proxy-server', proxyUrl)

    if (noProxy) {
      app.commandLine.appendSwitch('proxy-bypass-list', noProxy)
    }
  }

  // 清除代理
  clearProxy(): void {
    app.commandLine.removeSwitch('proxy-server')
    app.commandLine.removeSwitch('proxy-bypass-list')
  }

  // 设置开机自启
  setAutoStart(enabled: boolean): void {
    if (!app.isPackaged) return

    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
  }

  // 注册 IPC 处理程序
  registerIpcHandlers(ipcMain: Electron.IpcMain): void {
    // 加载设置
    ipcMain.handle('settings:load', async () => {
      return await this.loadSettings()
    })

    // 保存设置
    ipcMain.handle('settings:save', async (_, settings) => {
      await this.saveSettings(settings)

      // 应用开机自启设置
      this.setAutoStart(settings.general.autoStart)

      return true
    })

    // 设置代理
    ipcMain.on('settings:setProxy', (_, config) => {
      this.setProxy(config)
    })

    // 清除代理
    ipcMain.on('settings:clearProxy', () => {
      this.clearProxy()
    })
  }
} 