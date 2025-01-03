export interface DockerHost {
  id: string
  name: string
  connectionType: 'local' | 'tcp' | 'ssh'
  status: 'connected' | 'disconnected' | 'error'
  config: {
    host?: string
    port?: number
    socketPath?: string
    certPath?: string
    sshConfig?: {
      username: string
      privateKey?: string
      passphrase?: string
      password?: string
    }
  }
}

export interface Container {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: Array<{
    privatePort: number
    publicPort: number
    type: string
  }>
  created: string
  labels: Record<string, string>
}

export interface ContainerStats {
  cpu: number
  memory: {
    usage: number
    limit: number
  }
  network: {
    rx_bytes: number
    tx_bytes: number
  }
}

export interface ImageInfo {
  id: string
  tags: string[]
  size: number
  created: string
  favorite?: boolean
  notes?: string
} 