import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { DockerService } from './services/docker'
import { IpcService } from './services/ipc'
import { SSHService } from './services/ssh'
import { SettingsService } from './services/settings'

class Application {
  private mainWindow: BrowserWindow | null = null
  private dockerService: DockerService
  private ipcService: IpcService
  private sshService: SSHService
  private settingsService: SettingsService

  constructor() {
    // 初始化服务
    this.dockerService = new DockerService()
    this.sshService = new SSHService()
    this.settingsService = new SettingsService()
    this.ipcService = new IpcService(this.dockerService, this.sshService)

    // 注册错误处理
    this.handleErrors()

    // 注册 IPC 处理程序
    this.registerIpcHandlers()

    // 监听应用事件
    this.handleAppEvents()
  }

  // 创建主窗口
  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 768,
      frame: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js')
      }
    })

    // 加载页面
    if (app.isPackaged) {
      this.mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    } else {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    }

    // 窗口准备好时显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // 监听窗口最大化状态变化
    this.mainWindow.on('maximize', () => {
      this.mainWindow?.webContents.send('window-state-change', true)
    })

    this.mainWindow.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window-state-change', false)
    })

    // 处理外部链接
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  // 注册错误处理
  private handleErrors(): void {
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
    })

    // 捕获未处理的 Promise 异常
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled Rejection:', error)
    })
  }

  // 注册 IPC 处理程序
  private registerIpcHandlers(): void {
    // 注册 Docker 相关处理程序
    this.ipcService.registerHandlers(ipcMain)

    // 注册设置相关处理程序
    this.settingsService.registerIpcHandlers(ipcMain)

    // 注册窗口控制处理程序
    this.registerWindowHandlers()

    // 注册应用信息处理程序
    this.registerAppHandlers()
  }

  // 注册窗口控制处理程序
  private registerWindowHandlers(): void {
    ipcMain.on('window:minimize', () => {
      this.mainWindow?.minimize()
    })

    ipcMain.on('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow?.maximize()
      }
    })

    ipcMain.on('window:close', () => {
      this.mainWindow?.close()
    })
  }

  // 注册应用信息处理程序
  private registerAppHandlers(): void {
    // 获取版本信息
    ipcMain.handle('app:getVersions', () => {
      return {
        version: app.getVersion(),
        versions: {
          electron: process.versions.electron,
          chrome: process.versions.chrome,
          node: process.versions.node,
          v8: process.versions.v8,
          os: `${process.platform} ${process.arch}`
        }
      }
    })

    // 检查更新
    ipcMain.handle('app:checkUpdate', async () => {
      // TODO: 实现自动更新检查
      return false
    })

    // 打开官网
    ipcMain.on('app:openWebsite', () => {
      shell.openExternal('https://github.com/kingcide/mariner')
    })
  }

  // 处理应用事件
  private handleAppEvents(): void {
    // 应用准备就绪
    app.whenReady().then(() => {
      this.createMainWindow()

      // macOS 点击 dock 图标时重新创建窗口
      app.on('activate', () => {
        if (!BrowserWindow.getAllWindows().length) {
          this.createMainWindow()
        }
      })
    })

    // 所有窗口关闭时退出应用
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    // 应用退出前清理
    app.on('before-quit', () => {
      this.cleanup()
    })
  }

  // 清理资源
  private cleanup(): void {
    this.dockerService.cleanup()
    this.sshService.cleanup()
  }
}

// 创建应用实例
new Application()
