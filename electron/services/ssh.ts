import { Client } from 'ssh2'
import { Server, createServer } from 'net'
import { DockerHost } from '../../types/docker'

interface TunnelConfig {
  host: string
  port: number
  username: string
  privateKey: string
  passphrase?: string
  dstHost: string
  dstPort: number
  localHost: string
  localPort: number
}

export class SSHService {
  private tunnels: Map<string, { server: Server; client: Client }> = new Map()

  async createTunnel(hostId: string, config: TunnelConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      const client = new Client()

      client.on('ready', () => {
        // 创建本地服务器
        const server = createServer((socket) => {
          // 当有连接到本地端口时，创建到远程Docker的转发
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

        // 监听本地端口
        server.listen(config.localPort, config.localHost, () => {
          const address = server.address()
          if (typeof address === 'string' || !address) {
            reject(new Error('Invalid server address'))
            return
          }

          this.tunnels.set(hostId, { server, client })
          resolve(address.port)
        })
      })

      client.on('error', (err) => {
        reject(err)
      })

      // 连接到SSH服务器
      client.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
        readyTimeout: 30000,
        keepaliveInterval: 30000,
        keepaliveCountMax: 3
      })
    })
  }

  async closeTunnel(hostId: string): Promise<void> {
    const tunnel = this.tunnels.get(hostId)
    if (tunnel) {
      tunnel.server.close()
      tunnel.client.end()
      this.tunnels.delete(hostId)
    }
  }

  async testConnection(config: Pick<TunnelConfig, 'host' | 'port' | 'username' | 'privateKey' | 'passphrase'>): Promise<boolean> {
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
        host: config.host,
        port: config.port || 22,
        username: config.username,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
        readyTimeout: 30000
      })
    })
  }
} 