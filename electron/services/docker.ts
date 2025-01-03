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
      let docker: Docker

      switch (host.connectionType) {
        case 'local':
          docker = new Docker()
          break
        
        case 'tcp':
          docker = new Docker({
            host: host.config.host,
            port: host.config.port,
            ca: host.config.certPath ? readFileSync(`${host.config.certPath}/ca.pem`) : undefined,
            cert: host.config.certPath ? readFileSync(`${host.config.certPath}/cert.pem`) : undefined,
            key: host.config.certPath ? readFileSync(`${host.config.certPath}/key.pem`) : undefined,
          })
          break

        case 'ssh':
          if (!host.config.sshConfig) {
            throw new Error('SSH configuration is required')
          }

          const client = new Client()
          const server = await this.createTunnel(host.id, {
            host: host.config.host || 'localhost',
            port: host.config.port || 22,
            username: host.config.sshConfig.username,
            privateKey: host.config.sshConfig.privateKey,
            passphrase: host.config.sshConfig.passphrase,
            dstHost: 'localhost',
            dstPort: 2375,
            localHost: 'localhost',
            localPort: 0
          })

          docker = new Docker({
            host: 'localhost',
            port: server.address().port
          })

          this.tunnels.set(host.id, { server, client })
          break

        default:
          throw new Error(`Unsupported connection type: ${host.connectionType}`)
      }

      // 测试连接
      await docker.ping()
      
      this.connections.set(host.id, docker)
      return docker
    } catch (error) {
      // 如果是SSH连接，确保清理隧道
      if (host.connectionType === 'ssh') {
        await this.closeTunnel(host.id)
      }
      throw new Error(`Failed to connect to Docker host: ${(error as Error).message}`)
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

  private async createTunnel(hostId: string, config: any): Promise<Server> {
    return new Promise((resolve, reject) => {
      const client = new Client()

      client.on('ready', () => {
        const server = createServer((socket) => {
          client.forwardOut(
            config.localHost,
            config.localPort,
            config.dstHost,
            config.dstPort,
            (err, stream) => {
              if (err) {
                socket.end()
                return
              }

              socket.pipe(stream)
              stream.pipe(socket)

              stream.on('error', () => {
                socket.end()
              })

              socket.on('error', () => {
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
          resolve(server)
        })
      })

      client.on('error', (err) => {
        reject(err)
      })

      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
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
        privateKey: host.config.sshConfig.privateKey,
        passphrase: host.config.sshConfig.passphrase,
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