// 后端服务层，包含实际的 Docker 操作逻辑。
// 直接与 Docker daemon 的 API 进行交互。
import Docker from 'dockerode'
import { Client } from 'ssh2'
import { Server, createServer } from 'net'
import { readFileSync } from 'fs'
import { access } from 'fs/promises'
import { platform } from 'os'
import { constants } from 'fs'
import type { ContainerListResponse, ContainerDetails, DockerHost } from '../../types/docker'

// 日志级别定义
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class DockerService {
  private connections: Map<string, Docker>
  private tunnels: Map<string, { server: Server; client: Client }>

  constructor() {
    this.connections = new Map()
    this.tunnels = new Map()
    this.log(LogLevel.INFO, 'DockerService initialized')
  }

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] ${message}`
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data ? data : '')
        break
      case LogLevel.INFO:
        console.log(logMessage, data ? data : '')
        break
      case LogLevel.WARN:
        console.warn(logMessage, data ? data : '')
        break
      case LogLevel.ERROR:
        console.error(logMessage, data ? data : '')
        break
    }
  }

  // 获取本地 Docker socket 路径
  private getLocalSocketPath(): string {
    return platform() === 'win32'
      ? '//./pipe/docker_engine'
      : '/var/run/docker.sock'
  }

  // 检查本地 Docker 是否可用
  public async checkLocalDocker(): Promise<boolean> {
    try {
      const socketPath = this.getLocalSocketPath()
      await access(socketPath, constants.R_OK | constants.W_OK)
      
      // 尝试创建连接并测试
      const docker = new Docker({ socketPath })
      await docker.ping()
      
      return true
    } catch (error) {
      this.log(LogLevel.DEBUG, 'Local Docker not available', { error })
      return false
    }
  }

  // 连接到 Docker 主机
  async connect(host: DockerHost) {
    try {
      this.log(LogLevel.INFO, 'Connecting to Docker host', { 
        id: host.id, 
        type: host.connectionType,
        host: host.config.host
      })
      
      let docker: Docker

      switch (host.connectionType) {
        case 'local':
          this.log(LogLevel.DEBUG, 'Initializing local Docker connection')
          if (!await this.checkLocalDocker()) {
            throw new Error('Local Docker is not available')
          }
          docker = new Docker({ socketPath: this.getLocalSocketPath() })
          break
        
        case 'tcp':
          this.log(LogLevel.DEBUG, 'Initializing TCP Docker connection', {
            host: host.config.host,
            port: host.config.port
          })
          
          if (!host.config.host || !host.config.port) {
            throw new Error('TCP connection requires host and port')
          }
          
          const tcpOptions: any = {
            host: host.config.host,
            port: host.config.port
          }
          
          if (host.config.certPath) {
            try {
              tcpOptions.ca = readFileSync(`${host.config.certPath}/ca.pem`)
              tcpOptions.cert = readFileSync(`${host.config.certPath}/cert.pem`)
              tcpOptions.key = readFileSync(`${host.config.certPath}/key.pem`)
            } catch (error) {
              this.log(LogLevel.ERROR, 'Failed to read TLS certificates', error)
              throw new Error('Failed to read TLS certificates')
            }
          }
          
          docker = new Docker(tcpOptions)
          break

        case 'ssh':
          this.log(LogLevel.DEBUG, 'Initializing SSH Docker connection', {
            host: host.config.host,
            port: host.config.port,
            username: host.config.sshConfig?.username
          })
          
          if (!host.config.sshConfig) {
            throw new Error('SSH configuration is required')
          }

          const { server, client } = await this.createTunnel(host.id, {
            host: host.config.host || 'localhost',
            port: host.config.port || 22,
            username: host.config.sshConfig.username,
            ...(host.config.sshConfig.password
              ? { password: host.config.sshConfig.password }
              : {
                  privateKey: host.config.sshConfig.privateKey,
                  passphrase: host.config.sshConfig.passphrase
                }
            ),
            dstHost: 'localhost',
            dstPort: 2375,
            localHost: 'localhost',
            localPort: 0
          })

          const serverAddress = server.address()
          if (typeof serverAddress === 'string' || !serverAddress) {
            throw new Error('Invalid server address')
          }

          this.log(LogLevel.INFO, 'SSH tunnel created', { 
            localPort: serverAddress.port 
          })

          docker = new Docker({
            host: 'localhost',
            port: serverAddress.port
          })

          this.tunnels.set(host.id, { server, client })
          break

        default:
          throw new Error(`Unsupported connection type: ${host.connectionType}`)
      }

      // 测试连接并获取 Docker 信息
      this.log(LogLevel.DEBUG, 'Testing Docker connection')
      const info = await docker.info()
      this.log(LogLevel.INFO, 'Docker connection successful', {
        version: info.ServerVersion,
        containers: info.Containers,
        images: info.Images
      })
      
      this.connections.set(host.id, docker)
      return {
        version: info.ServerVersion,
        containers: info.Containers,
        images: info.Images,
        os: info.OperatingSystem,
        kernelVersion: info.KernelVersion,
        cpus: info.NCPU,
        memory: info.MemTotal
      }
    } catch (error) {
      this.log(LogLevel.ERROR, 'Docker connection failed', error)
      if (host.connectionType === 'ssh') {
        await this.closeTunnel(host.id)
      }
      throw error
    }
  }

  async disconnect(hostId: string) {
    const docker = this.connections.get(hostId)
    if (docker) {
      // 关闭SSH隧道（如果存在）
      await this.closeTunnel(hostId)
      this.connections.delete(hostId)
    }
  }

  async listContainers(hostId: string): Promise<ContainerListResponse> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }
    
    try {
      this.log(LogLevel.DEBUG, 'Listing containers', { hostId })
      
      // 并行获取容器列表和系统信息
      const [containers, info] = await Promise.all([
        docker.listContainers({ all: true }),
        docker.info()
      ])
      
      // 获取容器详细信息
      const containersWithDetails = await Promise.all(
        containers.map(async (container) => {
          try {
            const containerInstance = docker.getContainer(container.Id)
            const inspect = await containerInstance.inspect()
            
            const containerDetails: ContainerDetails = {
              id: container.Id,
              name: container.Names[0].replace(/^\//, ''),
              image: container.Image,
              state: inspect.State.Status,
              status: this.formatContainerStatus(inspect.State),
              created: new Date(container.Created * 1000).toISOString(),
              ports: this.deduplicatePorts(container.Ports.map(port => ({
                privatePort: port.PrivatePort,
                publicPort: port.PublicPort,
                type: port.Type
              })
              )),
              mounts: container.Mounts.map(mount => ({
                type: mount.Type,
                source: mount.Source,
                destination: mount.Destination
              })),
              inspect,
              config: inspect.Config,
              hostConfig: inspect.HostConfig,
              createdAt: new Date(inspect.Created).toISOString()
            }
            
            return containerDetails
          } catch (error) {
            this.log(LogLevel.ERROR, 'Failed to get container details', {
              containerId: container.Id,
              error
            })
            return null
          }
        })
      )
      
      // 过滤掉获取失败的容器
      const validContainers = containersWithDetails.filter((c: ContainerDetails | null): c is ContainerDetails => c !== null)
      
      // 计算统计信息
      const runningCount = validContainers.filter((c: ContainerDetails) => c.status === 'running').length
      const cpuUsage = info.NCPU ? (info.CPUUtilization || 0) / info.NCPU : 0
      const memoryUsage = info.MemTotal ? (info.MemoryUtilization || 0) / info.MemTotal * 100 : 0
      
      const response: ContainerListResponse = {
        containers: validContainers,
        stats: {
          totalCount: validContainers.length,
          runningCount,
          stoppedCount: validContainers.length - runningCount,
          cpu: Math.round(cpuUsage * 100),
          memory: Math.round(memoryUsage)
        }
      }
      
      this.log(LogLevel.DEBUG, 'Containers list retrieved', {
        totalCount: response.stats.totalCount,
        runningCount: response.stats.runningCount
      })
      
      return response
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to list containers', { error })
      throw error
    }
  }

  // 格式化容器状态的辅助方法
  private formatContainerStatus(state: any): string {
    if (!state) return 'unknown'

    if (state.Running) {
      if (state.Paused) return 'paused'
      if (state.Restarting) return 'restarting'
      return 'running'
    }

    if (state.Dead) return 'dead'
    if (state.Status === 'created') return 'created'
    if (state.Status === 'removing') return 'removing'
    
    return 'exited'
  }

  // 单独获取容器的实时统计信息
  async getContainerStats(hostId: string, containerId: string) {
    if (!containerId) {
      throw new Error('Container ID is required')
    }
    
    this.log(LogLevel.DEBUG, 'Fetching container stats', { hostId, containerId })
    
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      const container = docker.getContainer(containerId)
      if (!container) {
        throw new Error('Container not found')
      }

      this.log(LogLevel.DEBUG, 'Making Docker API request', {
        path: `/containers/${containerId}/stats`,
        method: 'GET'
      })

      const stats = await container.stats({ stream: false })
      
      // 处理并格式化统计数据
      const formattedStats = {
        cpu: {
          usage: this.calculateCPUPercentage(stats),
          system: stats.cpu_stats.system_cpu_usage,
          total: stats.cpu_stats.cpu_usage.total_usage
        },
        memory: {
          usage: stats.memory_stats.usage,
          limit: stats.memory_stats.limit,
          percentage: this.calculateMemoryPercentage(stats)
        },
        network: this.formatNetworkStats(stats.networks),
        blockIO: this.formatBlockIOStats(stats.blkio_stats)
      }

      this.log(LogLevel.DEBUG, 'Container stats processed', {
        containerId,
        stats: formattedStats
      })

      return formattedStats
    } catch (error: any) {
      this.log(LogLevel.ERROR, 'Container stats error', error)
      throw error
    }
  }

  // CPU 使用率计算
  private calculateCPUPercentage(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
    const cpuCount = stats.cpu_stats.online_cpus || 1

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100
    }
    return 0
  }

  // 内存使用率计算
  private calculateMemoryPercentage(stats: any): number {
    if (stats.memory_stats.limit) {
      return (stats.memory_stats.usage / stats.memory_stats.limit) * 100
    }
    return 0
  }

  // 网络统计格式化
  private formatNetworkStats(networks: any): any {
    if (!networks) return {}
    
    const result: any = {}
    Object.keys(networks).forEach(interface_ => {
      result[interface_] = {
        rx_bytes: networks[interface_].rx_bytes,
        tx_bytes: networks[interface_].tx_bytes,
        rx_packets: networks[interface_].rx_packets,
        tx_packets: networks[interface_].tx_packets
      }
    })
    return result
  }

  // 块设备 IO 统计格式化
  private formatBlockIOStats(blkioStats: any): any {
    if (!blkioStats || !blkioStats.io_service_bytes_recursive) {
      return { read: 0, write: 0 }
    }

    const stats = { read: 0, write: 0 }
    blkioStats.io_service_bytes_recursive.forEach((stat: any) => {
      if (stat.op === 'Read') stats.read += stat.value
      if (stat.op === 'Write') stats.write += stat.value
    })
    return stats
  }

  async listImages(hostId: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }
    return docker.listImages()
  }

  async getContainer(hostId: string, containerId: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }
    return docker.getContainer(containerId)
  }

  // 创建 SSH 隧道
  private async createTunnel(hostId: string, config: any): Promise<{ server: Server; client: Client }> {
    return new Promise((resolve, reject) => {
      try {
        const client = new Client()
        const server = createServer()

        server.listen(0, 'localhost', () => {
          const address = server.address()
          if (!address || typeof address === 'string') {
            reject(new Error('Invalid server address'))
            return
          }

          server.on('connection', (socket) => {
            client.forwardOut(
              'localhost',
              address.port,
              config.dstHost,
              config.dstPort,
              (err, stream) => {
                if (err) {
                  socket.end()
                  this.log(LogLevel.ERROR, 'SSH tunnel forward failed', err)
                  return
                }
                socket.pipe(stream).pipe(socket)
              }
            )
          })

          client.on('ready', () => {
            this.log(LogLevel.INFO, 'SSH client ready')
            resolve({ server, client })
          })

          client.on('error', (err) => {
            this.log(LogLevel.ERROR, 'SSH client error', err)
            reject(err)
          })

          const connectConfig = {
            host: config.host,
            port: config.port,
            username: config.username,
            ...(config.password
              ? { password: config.password }
              : {
                  privateKey: config.privateKey,
                  passphrase: config.passphrase
                }
            )
          }

          this.log(LogLevel.DEBUG, 'Connecting SSH client', {
            host: config.host,
            port: config.port,
            username: config.username
          })

          client.connect(connectConfig)
        })

        server.on('error', (err) => {
          this.log(LogLevel.ERROR, 'SSH tunnel server error', err)
          reject(err)
        })
      } catch (error) {
        this.log(LogLevel.ERROR, 'Failed to create SSH tunnel', error)
        reject(error)
      }
    })
  }

  // 关闭 SSH 隧道
  private async closeTunnel(hostId: string): Promise<void> {
    const tunnel = this.tunnels.get(hostId)
    if (tunnel) {
      try {
        tunnel.client.end()
        tunnel.server.close()
        this.tunnels.delete(hostId)
        this.log(LogLevel.INFO, 'SSH tunnel closed', { hostId })
      } catch (error) {
        this.log(LogLevel.ERROR, 'Failed to close SSH tunnel', error)
        throw error
      }
    }
  }

  // 测试 SSH 连接
  public async testSSHConnection(host: any): Promise<boolean> {
    try {
      if (!host.config.sshConfig) {
        throw new Error('SSH configuration is required')
      }

      const { server, client } = await this.createTunnel(host.id, {
        host: host.config.host || 'localhost',
        port: host.config.port || 22,
        username: host.config.sshConfig.username,
        ...(host.config.sshConfig.password
          ? { password: host.config.sshConfig.password }
          : {
              privateKey: host.config.sshConfig.privateKey,
              passphrase: host.config.sshConfig.passphrase
            }
        ),
        dstHost: 'localhost',
        dstPort: 2375,
        localHost: 'localhost',
        localPort: 0
      })

      // 关闭连接
      client.end()
      server.close()
      
      return true
    } catch (error) {
      this.log(LogLevel.ERROR, 'SSH connection test failed', error)
      return false
    }
  }

  public cleanup(): void {
    this.log(LogLevel.INFO, 'Cleaning up Docker service')
    for (const [hostId, docker] of this.connections.entries()) {
      this.log(LogLevel.DEBUG, 'Disconnecting host', { hostId })
      this.disconnect(hostId)
    }
    this.connections.clear()
    this.log(LogLevel.INFO, 'Docker service cleanup completed')
  }

  // 添加端口去重方法
  private deduplicatePorts(ports: Array<{ privatePort: number; publicPort?: number; type: string }>) {
    const portMap = new Map<string, { privatePort: number; publicPort?: number; type: string }>()
    
    ports.forEach(port => {
      const key = `${port.publicPort || ''}-${port.privatePort}-${port.type}`
      if (!portMap.has(key)) {
        portMap.set(key, port)
      }
    })
    
    return Array.from(portMap.values())
  }

  // 测试 TCP 连接
  public async testTCPConnection(host: DockerHost): Promise<boolean> {
    try {
      this.log(LogLevel.INFO, 'Testing TCP connection', {
        host: host.config.host,
        port: host.config.port
      })

      if (!host.config.host || !host.config.port) {
        throw new Error('TCP connection requires host and port')
      }

      const tcpOptions: any = {
        host: host.config.host,
        port: host.config.port
      }

      // 如果配置了证书路径，添加 TLS 配置
      if (host.config.certPath) {
        try {
          tcpOptions.ca = readFileSync(`${host.config.certPath}/ca.pem`)
          tcpOptions.cert = readFileSync(`${host.config.certPath}/cert.pem`)
          tcpOptions.key = readFileSync(`${host.config.certPath}/key.pem`)
        } catch (error) {
          this.log(LogLevel.ERROR, 'Failed to read TLS certificates', error)
          throw new Error('Failed to read TLS certificates')
        }
      }

      // 创建临时 Docker 连接并测试
      const docker = new Docker(tcpOptions)
      await docker.ping()

      this.log(LogLevel.INFO, 'TCP connection test successful')
      return true
    } catch (error) {
      this.log(LogLevel.ERROR, 'TCP connection test failed', error)
      return false
    }
  }

  // 镜像相关方法
  async pullImage(hostId: string, imageName: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Pulling image', { hostId, imageName })
      return await docker.pull(imageName)
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to pull image', error)
      throw error
    }
  }

  async exportImage(hostId: string, imageId: string, savePath: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Exporting image', { hostId, imageId, savePath })
      const image = docker.getImage(imageId)
      const stream = await image.get()
      return await new Promise((resolve, reject) => {
        stream.pipe(require('fs').createWriteStream(savePath))
          .on('finish', resolve)
          .on('error', reject)
      })
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to export image', error)
      throw error
    }
  }

  async deleteImage(hostId: string, imageId: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Deleting image', { hostId, imageId })
      const image = docker.getImage(imageId)
      return await image.remove()
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to delete image', error)
      throw error
    }
  }

  // 基础容器操作接口
  async startContainer(hostId: string, containerId: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Starting container', { hostId, containerId })
      const container = docker.getContainer(containerId)
      await container.start()
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to start container', error)
      throw error
    }
  }

  async stopContainer(hostId: string, containerId: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Stopping container', { hostId, containerId })
      const container = docker.getContainer(containerId)
      await container.stop()
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to stop container', error)
      throw error
    }
  }

  async killContainer(hostId: string, containerId: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Killing container', { hostId, containerId })
      const container = docker.getContainer(containerId)
      await container.kill()
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to kill container', error)
      throw error
    }
  }

  async pauseContainer(hostId: string, containerId: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Pausing container', { hostId, containerId })
      const container = docker.getContainer(containerId)
      await container.pause()
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to pause container', error)
      throw error
    }
  }

  async unpauseContainer(hostId: string, containerId: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Unpausing container', { hostId, containerId })
      const container = docker.getContainer(containerId)
      await container.unpause()
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to unpause container', error)
      throw error
    }
  }

  // 批量操作接口
  async batchOperation(
    hostId: string,
    containerIds: string[],
    operation: 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause' | 'remove'
  ): Promise<{
    success: string[],
    failed: Array<{
      id: string,
      error: string
    }>
  }> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    this.log(LogLevel.INFO, 'Performing batch operation', { 
      hostId, 
      operation, 
      containerCount: containerIds.length 
    })

    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>
    }

    await Promise.all(
      containerIds.map(async (containerId) => {
        try {
          const container = docker.getContainer(containerId)
          switch (operation) {
            case 'start':
              await container.start()
              break
            case 'stop':
              await container.stop()
              break
            case 'restart':
              await container.restart()
              break
            case 'kill':
              await container.kill()
              break
            case 'pause':
              await container.pause()
              break
            case 'unpause':
              await container.unpause()
              break
            case 'remove':
              await container.remove({ force: true })
              break
          }
          results.success.push(containerId)
        } catch (error) {
          this.log(LogLevel.ERROR, `Failed to ${operation} container`, {
            containerId,
            error
          })
          results.failed.push({
            id: containerId,
            error: (error as Error).message
          })
        }
      })
    )

    this.log(LogLevel.INFO, 'Batch operation completed', {
      operation,
      successCount: results.success.length,
      failedCount: results.failed.length
    })

    return results
  }

  // 高级操作接口
  async exportContainer(hostId: string, containerId: string, savePath: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Exporting container', { hostId, containerId, savePath })
      const container = docker.getContainer(containerId)
      const stream = await container.export()
      await new Promise((resolve, reject) => {
        const writeStream = require('fs').createWriteStream(savePath)
        stream.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to export container', error)
      throw error
    }
  }

  async commitContainer(
    hostId: string,
    containerId: string,
    options: {
      repo: string,
      tag: string,
      comment?: string,
      author?: string,
      changes?: string,
      pause?: boolean
    }
  ): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Committing container', { 
        hostId, 
        containerId,
        options 
      })
      const container = docker.getContainer(containerId)
      await container.commit({
        repo: options.repo,
        tag: options.tag,
        comment: options.comment,
        author: options.author,
        changes: options.changes,
        pause: options.pause !== false
      })
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to commit container', error)
      throw error
    }
  }

  async renameContainer(hostId: string, containerId: string, newName: string): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Renaming container', { 
        hostId, 
        containerId, 
        newName 
      })
      const container = docker.getContainer(containerId)
      await container.rename({ name: newName })
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to rename container', error)
      throw error
    }
  }

  async updateContainer(
    hostId: string,
    containerId: string,
    options: {
      cpuShares?: number,
      memory?: number,
      memoryReservation?: number,
      memorySwap?: number,
      cpusetCpus?: string,
      cpusetMems?: string,
      restartPolicy?: {
        Name: string,
        MaximumRetryCount?: number
      }
    }
  ): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Updating container', { 
        hostId, 
        containerId,
        options 
      })
      const container = docker.getContainer(containerId)
      await container.update(options)
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to update container', error)
      throw error
    }
  }

  // 文件复制接口
  async copyFromContainer(
    hostId: string,
    containerId: string,
    containerPath: string,
    hostPath: string
  ): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Copying from container', { 
        hostId, 
        containerId,
        containerPath,
        hostPath 
      })
      const container = docker.getContainer(containerId)
      const stream = await container.getArchive({ path: containerPath })
      await new Promise((resolve, reject) => {
        const writeStream = require('fs').createWriteStream(hostPath)
        stream.pipe(writeStream)
        writeStream.on('finish', resolve)
        writeStream.on('error', reject)
      })
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to copy from container', error)
      throw error
    }
  }

  async copyToContainer(
    hostId: string,
    containerId: string,
    hostPath: string,
    containerPath: string
  ): Promise<void> {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      this.log(LogLevel.INFO, 'Copying to container', { 
        hostId, 
        containerId,
        hostPath,
        containerPath 
      })
      const container = docker.getContainer(containerId)
      const tarStream = require('tar').c({
        gzip: true,
        file: hostPath
      })
      await container.putArchive(tarStream, { path: containerPath })
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to copy to container', error)
      throw error
    }
  }
} 