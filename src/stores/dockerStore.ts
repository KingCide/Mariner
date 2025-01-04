import { defineStore } from 'pinia'
import type { DockerHost, Container, ImageInfo, Volume, Network, ContainerListResponse, ContainerDetails } from '../../types/docker'

interface HostStats {
  containers: number
  images: number
  cpu: number
  memory: number
}

interface DockerState {
  hosts: DockerHost[]
  activeHostId: string | null
  containers: ContainerDetails[]
  images: ImageInfo[]
  volumes: Volume[]
  networks: Network[]
  loading: boolean
  error: string | null
  hostStats: Record<string, HostStats>
}

export const useDockerStore = defineStore('docker', {
  state: (): DockerState => ({
    hosts: [],
    activeHostId: null,
    containers: [],
    images: [],
    volumes: [],
    networks: [],
    loading: false,
    error: null,
    hostStats: {}
  }),

  getters: {
    activeHost: (state) => state.hosts.find(h => h.id === state.activeHostId),
    runningContainers: (state) => state.containers.filter(c => c.status === 'running'),
    stoppedContainers: (state) => state.containers.filter(c => c.status !== 'running'),
    favoriteImages: (state) => state.images.filter(i => i.favorite)
  },

  actions: {
    async addHost(host: Omit<DockerHost, 'id' | 'status'>) {
      this.loading = true
      try {
        this.hosts.push({
          ...host,
          id: crypto.randomUUID(),
          status: 'disconnected'
        })
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async removeHost(id: string) {
      const index = this.hosts.findIndex(h => h.id === id)
      if (index > -1) {
        this.hosts.splice(index, 1)
        if (this.activeHostId === id) {
          this.activeHostId = null
        }
      }
    },

    async setActiveHost(id: string) {
      this.activeHostId = id
    },

    async connectHost(host: DockerHost) {
      this.loading = true
      try {
        // 只传递最基本的连接信息
        const connectionConfig = {
          id: host.id,
          connectionType: host.connectionType,
          config: {
            host: host.config.host,
            port: host.config.port,
            socketPath: host.config.socketPath,
            certPath: host.config.certPath,
            sshConfig: host.config.sshConfig ? {
              username: host.config.sshConfig.username,
              password: host.config.sshConfig.password,
              privateKey: host.config.sshConfig.privateKey,
              passphrase: host.config.sshConfig.passphrase
            } : undefined
          }
        }
        
        await window.electron.ipcRenderer.invoke('docker:connect', connectionConfig)
        const index = this.hosts.findIndex(h => h.id === host.id)
        if (index > -1) {
          this.hosts[index].status = 'connected'
        }
        this.activeHostId = host.id
      } catch (err) {
        this.error = (err as Error).message
        throw err
      } finally {
        this.loading = false
      }
    },

    async disconnectHost(id: string) {
      this.loading = true
      try {
        await window.electron.ipcRenderer.invoke('docker:disconnect', id)
        const index = this.hosts.findIndex(h => h.id === id)
        if (index > -1) {
          this.hosts[index].status = 'disconnected'
        }
        if (this.activeHostId === id) {
          this.activeHostId = null
        }
      } catch (err) {
        this.error = (err as Error).message
        throw err
      } finally {
        this.loading = false
      }
    },

    async refreshContainers(hostId: string) {
      if (!hostId) return
      this.loading = true
      try {
        const response = await window.electron.ipcRenderer.invoke('docker:listContainers', hostId)
        this.containers = response.containers
        // 更新主机统计信息
        this.hostStats[hostId] = {
          ...this.hostStats[hostId] || {},
          containers: response.stats.totalCount,
          cpu: response.stats.cpu,
          memory: response.stats.memory
        }
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async refreshImages(hostId: string) {
      if (!hostId) return
      this.loading = true
      try {
        const images = await window.electron.ipcRenderer.invoke('docker:listImages', hostId)
        this.images = images
        // 更新主机统计信息中的镜像数量
        if (this.hostStats[hostId]) {
          this.hostStats[hostId].images = images.length
        }
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async startContainer(hostId: string, containerId: string) {
      await window.electron.ipcRenderer.invoke('docker:startContainer', { hostId, containerId })
    },

    async stopContainer(hostId: string, containerId: string) {
      await window.electron.ipcRenderer.invoke('docker:stopContainer', { hostId, containerId })
    },

    async restartContainer(hostId: string, containerId: string) {
      await window.electron.ipcRenderer.invoke('docker:restartContainer', { hostId, containerId })
    },

    async deleteContainer(hostId: string, containerId: string) {
      await window.electron.ipcRenderer.invoke('docker:deleteContainer', { hostId, containerId })
    },

    async getContainerLogs(hostId: string, containerId: string) {
      return window.electron.ipcRenderer.invoke('docker:containerLogs', { hostId, containerId })
    },

    async getContainerStats(hostId: string, containerId: string) {
      this.loading = true
      try {
        const stats = await window.electron.ipcRenderer.invoke('docker:getContainerStats', { hostId, containerId })
        return stats
      } catch (err) {
        this.error = (err as Error).message
        throw err
      } finally {
        this.loading = false
      }
    },

    async inspectContainer(hostId: string, containerId: string) {
      return window.electron.ipcRenderer.invoke('docker:inspectContainer', { hostId, containerId })
    },

    async execContainer(hostId: string, containerId: string, command: string[]) {
      return window.electron.ipcRenderer.invoke('docker:execContainer', { hostId, containerId, command })
    },

    async attachContainer(hostId: string, containerId: string) {
      return window.electron.ipcRenderer.invoke('docker:attachContainer', { hostId, containerId })
    },

    async pullImage(hostId: string, tag: string) {
      await window.electron.ipcRenderer.invoke('docker:pullImage', { hostId, tag })
    },

    async exportImage(hostId: string, imageId: string) {
      await window.electron.ipcRenderer.invoke('docker:exportImage', { hostId, imageId })
    },

    async deleteImage(hostId: string, imageId: string) {
      await window.electron.ipcRenderer.invoke('docker:deleteImage', { hostId, imageId })
    },

    async inspectImage(hostId: string, imageId: string) {
      return window.electron.ipcRenderer.invoke('docker:inspectImage', { hostId, imageId })
    },

    async refreshVolumes(hostId: string) {
      if (!hostId) return
      this.loading = true
      try {
        const volumes = await window.electron.ipcRenderer.invoke('docker:listVolumes', hostId)
        this.volumes = volumes
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async createVolume(hostId: string, options: { name: string, driver: string, labels: Record<string, string> }) {
      await window.electron.ipcRenderer.invoke('docker:createVolume', { hostId, ...options })
    },

    async deleteVolume(hostId: string, name: string) {
      await window.electron.ipcRenderer.invoke('docker:deleteVolume', { hostId, name })
    },

    async inspectVolume(hostId: string, name: string) {
      return window.electron.ipcRenderer.invoke('docker:inspectVolume', { hostId, name })
    },

    async refreshNetworks(hostId: string) {
      if (!hostId) return
      this.loading = true
      try {
        const networks = await window.electron.ipcRenderer.invoke('docker:listNetworks', hostId)
        this.networks = networks
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async createNetwork(hostId: string, options: {
      name: string
      driver: string
      subnet?: string
      gateway?: string
      internal?: boolean
      labels?: Record<string, string>
    }) {
      await window.electron.ipcRenderer.invoke('docker:createNetwork', { hostId, ...options })
    },

    async deleteNetwork(hostId: string, networkId: string) {
      await window.electron.ipcRenderer.invoke('docker:deleteNetwork', { hostId, networkId })
    },

    async inspectNetwork(hostId: string, networkId: string) {
      return window.electron.ipcRenderer.invoke('docker:inspectNetwork', { hostId, networkId })
    },

    async connectContainerToNetwork(hostId: string, networkId: string, containerId: string, aliases?: string[]) {
      await window.electron.ipcRenderer.invoke('docker:connectNetwork', {
        hostId,
        networkId,
        containerId,
        aliases
      })
    },

    async disconnectContainerFromNetwork(hostId: string, networkId: string, containerId: string) {
      await window.electron.ipcRenderer.invoke('docker:disconnectNetwork', {
        hostId,
        networkId,
        containerId
      })
    }
  }
}) 