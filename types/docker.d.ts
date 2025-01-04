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
  created: string
  ports: Array<{
    privatePort: number
    publicPort?: number
    type: string
  }>
  mounts: Array<{
    type: string
    source: string
    destination: string
  }>
}

export interface ContainerDetails extends Container {
  inspect: any
  state: any
  config: any
  hostConfig: any
  createdAt: string
  status: string
}

export interface ContainerListResponse {
  containers: ContainerDetails[]
  stats: {
    totalCount: number
    runningCount: number
    stoppedCount: number
    cpu: number
    memory: number
  }
}

export interface ImageInfo {
  id: string
  tags: string[]
  size: number
  created: string
  favorite?: boolean
}

export interface Volume {
  name: string
  driver: string
  mountpoint: string
  scope: string
  options: Record<string, string>
  labels: Record<string, string>
}

export interface Network {
  id: string
  name: string
  driver: string
  scope: string
  ipam: {
    driver: string
    config: Array<{
      subnet: string
      gateway?: string
    }>
  }
  internal: boolean
  attachable: boolean
  ingress: boolean
  containers: Record<string, {
    name: string
    ipv4Address?: string
    ipv6Address?: string
  }>
  options: Record<string, string>
  labels: Record<string, string>
} 