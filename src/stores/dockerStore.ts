import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DockerService } from '../services/docker'
import type { DockerHost, Container, ImageInfo } from '../../types/docker'

const dockerService = new DockerService()

export const useDockerStore = defineStore('docker', () => {
  const hosts = ref<DockerHost[]>([])
  const selectedHostId = ref<string | null>(null)
  const containers = ref<Container[]>([])
  const images = ref<ImageInfo[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // 计算属性
  const selectedHost = computed(() => 
    hosts.value.find(h => h.id === selectedHostId.value)
  )

  const isConnected = computed(() =>
    selectedHost.value?.status === 'connected'
  )

  // 添加运行中容器的计算属性
  const runningContainers = computed(() =>
    Array.isArray(containers.value) ? containers.value.filter(c => c.status === 'running') : []
  )

  // 添加主机统计信息
  const hostStats = ref<Record<string, { containers: number; cpu: number; memory: number }>>({})

  // 更新主机统计信息
  const updateHostStats = (hostId: string, stats: { containers: number; cpu: number; memory: number }) => {
    hostStats.value[hostId] = stats
  }

  // 添加 activeHostId 计算属性
  const activeHostId = computed(() => selectedHostId.value)

  // 容器统计信息
  const getContainerStats = async (hostId: string, containerId: string) => {
    try {
      loading.value = true
      error.value = null
      return await dockerService.getContainerStats(hostId, containerId)
    } catch (err) {
      error.value = `获取容器统计信息失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  // 主机管理
  const addHost = async (host: Omit<DockerHost, 'id' | 'status'>) => {
    try {
      const newHost: DockerHost = {
        id: crypto.randomUUID(),
        status: 'disconnected',
        ...host
      }
      hosts.value.push(newHost)
      return newHost
    } catch (err) {
      error.value = `添加主机失败: ${(err as Error).message}`
      throw err
    }
  }

  const updateHost = async (host: DockerHost) => {
    try {
      const index = hosts.value.findIndex(h => h.id === host.id)
      if (index === -1) {
        throw new Error('主机不存在')
      }
      hosts.value[index] = host
    } catch (err) {
      error.value = `更新主机失败: ${(err as Error).message}`
      throw err
    }
  }

  const removeHost = async (hostId: string) => {
    try {
      const index = hosts.value.findIndex(h => h.id === hostId)
      if (index === -1) {
        throw new Error('主机不存在')
      }
      
      // 如果是当前选中的主机，先断开连接
      if (hostId === selectedHostId.value) {
        await disconnectHost(hostId)
        selectedHostId.value = null
      }
      
      hosts.value.splice(index, 1)
    } catch (err) {
      error.value = `删除主机失败: ${(err as Error).message}`
      throw err
    }
  }

  // 连接管理
  const connectHost = async (hostId: string) => {
    let targetHost: DockerHost | undefined
    
    try {
      loading.value = true
      error.value = null
      
      targetHost = hosts.value.find(h => h.id === hostId)
      if (!targetHost) {
        throw new Error('主机不存在')
      }

      // 更新状态为连接中
      targetHost.status = 'connecting'
      
      // 创建一个简化的主机配置对象
      const hostConfig: DockerHost = {
        id: targetHost.id,
        name: targetHost.name,
        connectionType: targetHost.connectionType,
        status: 'connecting',
        config: {
          host: targetHost.config.host,
          port: targetHost.config.port,
          socketPath: targetHost.config.socketPath,
          certPath: targetHost.config.certPath,
          sshConfig: targetHost.config.sshConfig ? {
            username: targetHost.config.sshConfig.username,
            password: targetHost.config.sshConfig.password,
            privateKey: targetHost.config.sshConfig.privateKey,
            passphrase: targetHost.config.sshConfig.passphrase
          } : undefined
        }
      }
      
      // 获取主机信息
      const info = await dockerService.connectHost(hostConfig)
      
      // 更新主机信息和状态
      targetHost.info = info
      targetHost.status = 'connected'
      selectedHostId.value = hostId
      
      // 加载容器和镜像列表
      await Promise.all([
        refreshContainers(),
        refreshImages(hostId)
      ])
    } catch (err) {
      if (targetHost) {
        targetHost.status = 'error'
      }
      error.value = `连接失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  const disconnectHost = async (hostId: string) => {
    try {
      loading.value = true
      error.value = null
      
      const host = hosts.value.find(h => h.id === hostId)
      if (!host) {
        throw new Error('主机不存在')
      }

      await dockerService.disconnectHost(hostId)
      
      // 清空相关数据
      if (hostId === selectedHostId.value) {
        selectedHostId.value = null
        containers.value = []
        images.value = []
      }
      
      host.status = 'disconnected'
    } catch (err) {
      error.value = `断开连接失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  // 容器管理
  const refreshContainers = async () => {
    if (!selectedHostId.value || !isConnected.value) return
    
    try {
      loading.value = true
      error.value = null
      const response = await dockerService.listContainers(selectedHostId.value)
      containers.value = response.containers
      
      // 更新主机统计信息
      if (selectedHostId.value) {
        updateHostStats(selectedHostId.value, {
          containers: response.stats.totalCount,
          cpu: response.stats.cpu,
          memory: response.stats.memory
        })
      }
    } catch (err) {
      error.value = `加载容器列表失败: ${(err as Error).message}`
      containers.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  // 镜像管理
  const refreshImages = async (hostId?: string) => {
    const targetHostId = hostId || selectedHostId.value
    if (!targetHostId || !isConnected.value) return

    try {
      loading.value = true
      error.value = null
      const imageList = await dockerService.listImages(targetHostId)
      images.value = imageList
    } catch (err) {
      error.value = `Failed to refresh images: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  // 测试连接
  const testConnection = async (host: DockerHost) => {
    try {
      loading.value = true
      error.value = null
      
      if (host.connectionType === 'ssh') {
        return await dockerService.testSSHConnection(host)
      }
      
      // 对于其他连接类型，尝试直接连接
      await dockerService.connectHost(host)
      await dockerService.disconnectHost(host.id)
      return true
    } catch (err) {
      error.value = `连接测试失败: ${(err as Error).message}`
      return false
    } finally {
      loading.value = false
    }
  }

  // 容器操作方法
  const startContainer = async (hostId: string, containerId: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.startContainer(hostId, containerId)
    } catch (err) {
      error.value = `启动容器失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  const stopContainer = async (hostId: string, containerId: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.stopContainer(hostId, containerId)
    } catch (err) {
      error.value = `停止容器失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  const restartContainer = async (hostId: string, containerId: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.restartContainer(hostId, containerId)
    } catch (err) {
      error.value = `重启容器失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteContainer = async (hostId: string, containerId: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.deleteContainer(hostId, containerId)
    } catch (err) {
      error.value = `删除容器失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }
  // 镜像相关方法
  const pullImage = async (hostId: string, imageName: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.pullImage(hostId, imageName)
      await refreshImages()
    } catch (err) {
      error.value = `拉取镜像失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  const exportImage = async (hostId: string, imageId: string, savePath: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.exportImage(hostId, imageId, savePath)
    } catch (err) {
      error.value = `导出镜像失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteImage = async (hostId: string, imageId: string) => {
    try {
      loading.value = true
      error.value = null
      await dockerService.deleteImage(hostId, imageId)
      await refreshImages()
    } catch (err) {
      error.value = `删除镜像失败: ${(err as Error).message}`
      throw err
    } finally {
      loading.value = false
    }
  }

  // 设置选中主机
  const setSelectedHost = async (hostId: string) => {
    try {
      const host = hosts.value.find(h => h.id === hostId)
      if (!host) {
        throw new Error('主机不存在')
      }

      if (host.status !== 'connected') {
        // 如果主机未连接，先尝试连接
        await connectHost(hostId)
      }

      selectedHostId.value = hostId
      
      // 连接成功后刷新数据
      await Promise.all([
        refreshContainers(),
        refreshImages(hostId)
      ])
    } catch (error) {
      throw error
    }
  }

  return {
    // 状态
    hosts,
    selectedHostId,
    containers,
    images,
    loading,
    error,
    hostStats,
    
    // 计算属性
    selectedHost,
    isConnected,
    runningContainers,
    activeHostId,
    
    // 方法
    addHost,
    updateHost,
    removeHost,
    connectHost,
    disconnectHost,
    refreshContainers,
    refreshImages,
    testConnection,
    startContainer,
    stopContainer,
    restartContainer,
    deleteContainer,
    getContainerStats,
    pullImage,
    exportImage,
    deleteImage,
    setSelectedHost,
  }
  
}) 