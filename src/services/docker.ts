import type { DockerHost, Container, ContainerStats, ImageInfo, ContainerListResponse } from '../../types/docker'

const ipc = window.electron.ipcRenderer

export class DockerService {
  async connectHost(host: DockerHost) {
    return ipc.invoke('docker:connect', host)
  }

  async disconnectHost(hostId: string) {
    return ipc.invoke('docker:disconnect', hostId)
  }

  async testSSHConnection(host: DockerHost): Promise<boolean> {
    return await ipc.invoke('docker:testSSH', host)
  }

  async testTCPConnection(host: DockerHost): Promise<boolean> {
    return await ipc.invoke('docker:testTCP', host)
  }

  async listContainers(hostId: string): Promise<ContainerListResponse> {
    return ipc.invoke('docker:listContainers', hostId)
  }

  async getContainerStats(hostId: string, containerId: string): Promise<ContainerStats> {
    return ipc.invoke('docker:getContainerStats', { hostId, containerId })
  }

  async startContainer(hostId: string, containerId: string) {
    return ipc.invoke('docker:startContainer', { hostId, containerId })
  }

  async stopContainer(hostId: string, containerId: string) {
    return ipc.invoke('docker:stopContainer', { hostId, containerId })
  }

  async restartContainer(hostId: string, containerId: string) {
    return ipc.invoke('docker:restartContainer', { hostId, containerId })
  }

  async listImages(hostId: string): Promise<ImageInfo[]> {
    return ipc.invoke('docker:listImages', hostId)
  }

  async getContainerLogs(hostId: string, containerId: string): Promise<string> {
    return ipc.invoke('docker:containerLogs', { hostId, containerId })
  }

  async deleteContainer(hostId: string, containerId: string) {
    return ipc.invoke('docker:deleteContainer', { hostId, containerId })
  }

  // 镜像相关方法
  async pullImage(hostId: string, imageName: string) {
    return ipc.invoke('docker:pullImage', { hostId, imageName })
  }

  async exportImage(hostId: string, imageId: string, savePath: string) {
    return ipc.invoke('docker:exportImage', { hostId, imageId, savePath })
  }

  async deleteImage(hostId: string, imageId: string) {
    return ipc.invoke('docker:deleteImage', { hostId, imageId })
  }
} 