import Docker from 'dockerode'
import { Client } from 'ssh2'
import { Server, createServer } from 'net'
import { readFileSync } from 'fs'

export class DockerService {
  private connections: Map<string, Docker>
  private tunnels: Map<string, { server: Server; client: Client }>

  constructor() {
    this.connections = new Map()
    this.tunnels = new Map()
  }

  async connect(host: any) {
    try {
      console.log('Received connection request:', JSON.stringify(host))
      let docker: Docker

      switch (host.connectionType) {
        case 'local':
          console.log('Connecting to local Docker')
          docker = new Docker()
          break
        
        case 'tcp':
          console.log('Connecting to TCP Docker')
          docker = new Docker({
            host: host.config.host,
            port: host.config.port,
            ca: host.config.certPath ? readFileSync(`${host.config.certPath}/ca.pem`) : undefined,
            cert: host.config.certPath ? readFileSync(`${host.config.certPath}/cert.pem`) : undefined,
            key: host.config.certPath ? readFileSync(`${host.config.certPath}/key.pem`) : undefined,
          })
          break

        case 'ssh':
          console.log('Connecting to SSH Docker')
          if (!host.config.sshConfig) {
            throw new Error('SSH configuration is required')
          }

          console.log('Creating SSH tunnel with config:', {
            host: host.config.host,
            port: host.config.port,
            username: host.config.sshConfig.username,
            authType: host.config.sshConfig.password ? 'password' : 'privateKey'
          })

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

          console.log('SSH tunnel created, connecting to Docker on port:', serverAddress.port)

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
      console.log('Testing Docker connection...')
      await docker.ping()
      console.log('Docker connection successful')
      
      this.connections.set(host.id, docker)
      return true // 只返回成功状态，而不是返回Docker实例
    } catch (error) {
      console.error('Docker connection failed:', error)
      // 如果是SSH连接，确保清理隧道
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

  async listContainers(hostId: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }
    return docker.listContainers({ all: true })
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

  async getContainerStats(hostId: string, containerId: string) {
    const container = await this.getContainer(hostId, containerId)
    return container.stats({ stream: false })
  }

  async getHostStats(hostId: string) {
    const docker = this.connections.get(hostId)
    if (!docker) {
      throw new Error('Docker host not connected')
    }

    try {
      // 获取容器列表
      const containers = await docker.listContainers()
      // 获取镜像列表
      const images = await docker.listImages()
      
      // 获取系统信息
      const info = await docker.info()
      
      // 计算CPU和内存使用率
      const cpuUsage = info.NCPU ? (info.CPUUtilization || 0) / info.NCPU : 0
      const memoryUsage = info.MemTotal ? (info.MemoryUtilization || 0) / info.MemTotal * 100 : 0

      return {
        containers: containers.length,
        images: images.length,
        cpu: Math.round(cpuUsage * 100),
        memory: Math.round(memoryUsage)
      }
    } catch (error) {
      console.error('Failed to get host stats:', error)
      throw error
    }
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
            (err, stream) => {
              if (err) {
                console.error('Port forwarding error:', err)
                socket.end()
                return
              }

              socket.pipe(stream)
              stream.pipe(socket)

              stream.on('error', (err) => {
                console.error('Stream error:', err)
                socket.end()
              })

              socket.on('error', (err) => {
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
      tunnel.server.close()
      tunnel.client.end()
      this.tunnels.delete(hostId)
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
    // 断开所有 Docker 连接
    for (const [hostId, docker] of this.connections.entries()) {
      this.disconnect(hostId)
    }
    this.connections.clear()
  }
} 