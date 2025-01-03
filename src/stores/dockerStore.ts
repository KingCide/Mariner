import { defineStore } from 'pinia'
import type { DockerHost, Container, ImageInfo } from '../../types/docker'

interface DockerState {
  hosts: DockerHost[]
  activeHostId: string | null
  containers: Container[]
  images: ImageInfo[]
  loading: boolean
  error: string | null
}

export const useDockerStore = defineStore('docker', {
  state: (): DockerState => ({
    hosts: [],
    activeHostId: null,
    containers: [],
    images: [],
    loading: false,
    error: null
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
    }
  }
}) 