import { ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'
import { DockerService } from './docker'

export class IpcService {
  private dockerService: DockerService

  constructor() {
    this.dockerService = new DockerService()
    this.setupHandlers()
  }

  private setupHandlers() {
    // 文件对话框
    ipcMain.handle('dialog:openFile', async (_, options) => {
      return dialog.showOpenDialog(options)
    })

    // 文件读取
    ipcMain.handle('fs:readFile', async (_, filePath) => {
      return readFile(filePath, 'utf-8')
    })

    // Docker主机管理
    ipcMain.handle('docker:connect', async (_, host) => {
      return this.dockerService.connect(host)
    })

    ipcMain.handle('docker:disconnect', async (_, hostId) => {
      return this.dockerService.disconnect(hostId)
    })

    // SSH连接测试
    ipcMain.handle('docker:testSSH', async (_, host) => {
      return this.dockerService.testSSHConnection(host)
    })

    // 容器管理
    ipcMain.handle('docker:listContainers', async (_, hostId) => {
      return this.dockerService.listContainers(hostId)
    })

    ipcMain.handle('docker:getContainerStats', async (_, { hostId, containerId }) => {
      return this.dockerService.getContainerStats(hostId, containerId)
    })

    // 容器操作
    ipcMain.handle('docker:startContainer', async (_, { hostId, containerId }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      return container.start()
    })

    ipcMain.handle('docker:stopContainer', async (_, { hostId, containerId }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      return container.stop()
    })

    ipcMain.handle('docker:restartContainer', async (_, { hostId, containerId }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      return container.restart()
    })

    // 镜像管理
    ipcMain.handle('docker:listImages', async (_, hostId) => {
      return this.dockerService.listImages(hostId)
    })

    // 容器日志
    ipcMain.handle('docker:containerLogs', async (_, { hostId, containerId }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 100,
        follow: false
      })
      return logs.toString()
    })
  }
} 