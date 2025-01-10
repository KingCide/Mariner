import { ipcMain, dialog, IpcMainInvokeEvent, OpenDialogOptions } from 'electron'
import { readFile } from 'fs/promises'
import { DockerService } from './dockerServer'

export class IpcService {
  constructor(
    private dockerService: DockerService,
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

    // 检查本地 Docker
    ipcMain.handle('docker:checkLocal', async () => {
      return this.dockerService.checkLocalDocker()
    })

    // SSH连接测试
    ipcMain.handle('docker:testSSH', async (_: IpcMainInvokeEvent, host: any) => {
      return this.dockerService.testSSHConnection(host)
    })

    // TCP连接测试
    ipcMain.handle('docker:testTCP', async (_: IpcMainInvokeEvent, host: any) => {
      return this.dockerService.testTCPConnection(host)
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

    // 批量操作容器
    ipcMain.handle('docker:batchOperation', async (_: IpcMainInvokeEvent, { 
      hostId, 
      containerIds, 
      operation 
    }: { 
      hostId: string; 
      containerIds: string[]; 
      operation: 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause' | 'remove' 
    }) => {
      return this.dockerService.batchOperation(hostId, containerIds, operation)
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

    ipcMain.handle('docker:pullImage', async (_: IpcMainInvokeEvent, { hostId, imageName }: { hostId: string; imageName: string }) => {
      return this.dockerService.pullImage(hostId, imageName)
    })

    ipcMain.handle('docker:exportImage', async (_: IpcMainInvokeEvent, { hostId, imageId, savePath }: { hostId: string; imageId: string; savePath: string }) => {
      return this.dockerService.exportImage(hostId, imageId, savePath)
    })

    ipcMain.handle('docker:deleteImage', async (_: IpcMainInvokeEvent, { hostId, imageId }: { hostId: string; imageId: string }) => {
      return this.dockerService.deleteImage(hostId, imageId)
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