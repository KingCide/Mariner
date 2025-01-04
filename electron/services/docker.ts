import Docker from 'dockerode'
import { Client } from 'ssh2'
import { Server, createServer } from 'net'
import { readFileSync } from 'fs'
import type { ContainerListResponse, ContainerDetails } from '../../types/docker'

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

  async connect(host: any) {
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
          docker = new Docker()
          break
        
        case 'tcp':
          this.log(LogLevel.DEBUG, 'Initializing TCP Docker connection', {
            host: host.config.host,
            port: host.config.port
          })
          docker = new Docker({
            host: host.config.host,
            port: host.config.port,
            ca: host.config.certPath ? readFileSync(`${host.config.certPath}/ca.pem`) : undefined,
            cert: host.config.certPath ? readFileSync(`${host.config.certPath}/cert.pem`) : undefined,
            key: host.config.certPath ? readFileSync(`${host.config.certPath}/key.pem`) : undefined,
          })
          break

        case 'ssh':
          this.log(LogLevel.DEBUG, 'Initializing SSH Docker connection', {
            host: host.config.host,
            port: host.config.port,
            username: host.config.sshConfig.username
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

      // 测试连接
      this.log(LogLevel.DEBUG, 'Testing Docker connection')
      await docker.ping()
      this.log(LogLevel.INFO, 'Docker connection successful')
      
      this.connections.set(host.id, docker)
      return true
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
              ports: container.Ports.map(port => ({
                privatePort: port.PrivatePort,
                publicPort: port.PublicPort,
                type: port.Type
              })),
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

  private async createTunnel(hostId: string, config: any): Promise<{ server: Server; client: Client }> {
    return new Promise((resolve, reject) => {
      const client = new Client()

      client.on('ready', () => {
        console.log('SSH client ready')
        const server = createServer((socket) => {
          client.forwardOut(
            config.localHost,
            config.localPort,
            config.dstHost,
            config.dstPort,
            (err: Error | undefined, stream) => {
              if (err) {
                console.error('Port forwarding error:', err)
                socket.end()
                return
              }

              socket.pipe(stream)
              stream.pipe(socket)

              stream.on('error', (err: Error) => {
                console.error('Stream error:', err)
                socket.end()
              })

              socket.on('error', (err: Error) => {
                console.error('Socket error:', err)
                stream.end()
              })
            }
          )
        })

        server.on('error', (err) => {
          console.error('Server error:', err)
          this.closeTunnel(hostId)
        })

        server.listen(config.localPort, config.localHost, () => {
          console.log('Local server listening')
          resolve({ server, client })
        })
      })

      client.on('error', (err) => {
        console.error('SSH client error:', err)
        reject(err)
      })

      console.log('Connecting SSH client...')
      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        ...(config.password
          ? { password: config.password }
          : {
              privateKey: config.privateKey,
              passphrase: config.passphrase
            }
        ),
        readyTimeout: 30000,
        keepaliveInterval: 30000,
        keepaliveCountMax: 3
      })
    })
  }

  private async closeTunnel(hostId: string) {
    const tunnel = this.tunnels.get(hostId)
    if (tunnel) {
      this.log(LogLevel.DEBUG, 'Closing SSH tunnel', { hostId })
      tunnel.server.close()
      tunnel.client.end()
      this.tunnels.delete(hostId)
      this.log(LogLevel.INFO, 'SSH tunnel closed', { hostId })
    }
  }

  async testSSHConnection(host: any) {
    if (!host.config.sshConfig) {
      throw new Error('SSH configuration is required')
    }

    return new Promise((resolve, reject) => {
      const client = new Client()

      client.on('ready', () => {
        client.end()
        resolve(true)
      })

      client.on('error', (err) => {
        reject(err)
      })

      client.connect({
        host: host.config.host,
        port: host.config.port || 22,
        username: host.config.sshConfig.username,
        ...(host.config.sshConfig.password
          ? { password: host.config.sshConfig.password }
          : {
              privateKey: host.config.sshConfig.privateKey,
              passphrase: host.config.sshConfig.passphrase
            }
        ),
        readyTimeout: 30000
      })
    })
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
} 