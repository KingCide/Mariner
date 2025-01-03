import { ipcMain, dialog, IpcMainInvokeEvent, OpenDialogOptions } from 'electron'
import { readFile } from 'fs/promises'
import { DockerService } from './docker'
import { SSHService } from './ssh'

export class IpcService {
  constructor(
    private dockerService: DockerService,
    private sshService: SSHService
  ) {}

  public registerHandlers(ipcMain: Electron.IpcMain): void {
    // 文件对话框
    ipcMain.handle('dialog:openFile', async (_: IpcMainInvokeEvent, options: OpenDialogOptions) => {
      return dialog.showOpenDialog(options)
    })

    // 文件读取
    ipcMain.handle('fs:readFile', async (_: IpcMainInvokeEvent, filePath: string) => {
      return readFile(filePath, 'utf-8')
    })

    // Docker主机管理
    ipcMain.handle('docker:connect', async (_: IpcMainInvokeEvent, host: any) => {
      return this.dockerService.connect(host)
    })

    ipcMain.handle('docker:disconnect', async (_: IpcMainInvokeEvent, hostId: string) => {
      return this.dockerService.disconnect(hostId)
    })

    ipcMain.handle('docker:getHostStats', async (_: IpcMainInvokeEvent, hostId: string) => {
      return this.dockerService.getHostStats(hostId)
    })

    // SSH连接测试
    ipcMain.handle('docker:testSSH', async (_: IpcMainInvokeEvent, host: any) => {
      return this.dockerService.testSSHConnection(host)
    })

    // 容器管理
    ipcMain.handle('docker:listContainers', async (_: IpcMainInvokeEvent, hostId: string) => {
      return this.dockerService.listContainers(hostId)
    })

    ipcMain.handle('docker:getContainerStats', async (_: IpcMainInvokeEvent, { hostId, containerId }: { hostId: string; containerId: string }) => {
      return this.dockerService.getContainerStats(hostId, containerId)
    })

    // 容器操作
    ipcMain.handle('docker:startContainer', async (_: IpcMainInvokeEvent, { hostId, containerId }: { hostId: string; containerId: string }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      return container.start()
    })

    ipcMain.handle('docker:stopContainer', async (_: IpcMainInvokeEvent, { hostId, containerId }: { hostId: string; containerId: string }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      return container.stop()
    })

    ipcMain.handle('docker:restartContainer', async (_: IpcMainInvokeEvent, { hostId, containerId }: { hostId: string; containerId: string }) => {
      const container = await this.dockerService.getContainer(hostId, containerId)
      return container.restart()
    })

    // 镜像管理
    ipcMain.handle('docker:listImages', async (_: IpcMainInvokeEvent, hostId: string) => {
      return this.dockerService.listImages(hostId)
    })

    // 容器日志
    ipcMain.handle('docker:containerLogs', async (_: IpcMainInvokeEvent, { hostId, containerId }: { hostId: string; containerId: string }) => {
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