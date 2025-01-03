import type { DockerHost, Container, ContainerStats, ImageInfo } from '../../types/docker'

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>
      }
    }
  }
}

const ipc = window.electron.ipcRenderer

export class DockerService {
  async connectHost(host: DockerHost) {
    return ipc.invoke('docker:connect', host)
  }

  async disconnectHost(hostId: string) {
    return ipc.invoke('docker:disconnect', hostId)
  }

  async testSSHConnection(host: DockerHost): Promise<boolean> {
    return ipc.invoke('docker:testSSH', host)
  }

  async listContainers(hostId: string): Promise<Container[]> {
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
} 