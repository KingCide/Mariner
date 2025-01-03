import { defineStore } from 'pinia'
import type { DockerHost, Container, ImageInfo } from '../../types/docker'

interface HostStats {
  containers: number
  images: number
  cpu: number
  memory: number
}

interface DockerState {
  hosts: DockerHost[]
  activeHostId: string | null
  containers: Container[]
  images: ImageInfo[]
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
    loading: false,
    error: null,
    hostStats: {}
  }),

  getters: {
    activeHost: (state) => state.hosts.find(h => h.id === state.activeHostId),
    runningContainers: (state) => state.containers.filter(c => c.state === 'running'),
    favoriteImages: (state) => state.images.filter(i => i.favorite)
  },

  actions: {
    async addHost(host: Omit<DockerHost, 'id' | 'status'>) {
      this.loading = true
      try {
        // TODO: 通过IPC调用主进程添加主机
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
      // TODO: 连接到选中的主机并获取容器列表
    },

    async connectHost(host: DockerHost) {
      this.loading = true
      try {
        // 只传递最基本的连接信息
        interface ConnectionConfig {
          id: string
          connectionType: 'local' | 'tcp' | 'ssh'
          config: {
            host?: string
            port?: number
            sshConfig?: {
              username: string
              password?: string
              privateKey?: string
              passphrase?: string
            }
            certPath?: string
          }
        }

        const connectionConfig: ConnectionConfig = {
          id: host.id,
          connectionType: host.connectionType,
          config: {
            host: host.config.host,
            port: host.config.port
          }
        }

        // 如果是SSH连接，添加SSH配置
        if (host.connectionType === 'ssh' && host.config.sshConfig) {
          connectionConfig.config = {
            ...connectionConfig.config,
            sshConfig: {
              username: host.config.sshConfig.username,
              password: host.config.sshConfig.password,
              privateKey: host.config.sshConfig.privateKey,
              passphrase: host.config.sshConfig.passphrase
            }
          }
        }

        // 如果是TCP连接，添加证书路径
        if (host.connectionType === 'tcp' && host.config.certPath) {
          connectionConfig.config = {
            ...connectionConfig.config,
            certPath: host.config.certPath
          }
        }
        
        console.log('Connecting with config:', JSON.stringify(connectionConfig))
        // 通过IPC调用主进程连接主机
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
        // 通过IPC调用主进程断开主机连接
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

    async refreshContainers() {
      if (!this.activeHostId) return
      this.loading = true
      try {
        // TODO: 通过IPC获取容器列表
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async refreshImages() {
      if (!this.activeHostId) return
      this.loading = true
      try {
        // TODO: 通过IPC获取镜像列表
      } catch (err) {
        this.error = (err as Error).message
      } finally {
        this.loading = false
      }
    },

    async refreshHostStats(hostId: string) {
      try {
        const stats = await window.electron.ipcRenderer.invoke('docker:getHostStats', hostId)
        this.hostStats[hostId] = stats
      } catch (err) {
        console.error('Failed to refresh host stats:', err)
        this.error = (err as Error).message
      }
    }
  }
}) 