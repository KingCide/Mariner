// TS类型定义文件，定义统一的类型接口
// 提供类型检查和代码提示，确保前后端数据结构一致性
export interface DockerHost {
  id: string
  name: string
  connectionType: 'local' | 'tcp' | 'ssh'
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  config: {
    host?: string
    port?: number
    dockerPort?: number
    socketPath?: string
    certPath?: string
    sshConfig?: {
      username: string
      privateKey?: string
      privateKeyPath?: string
      passphrase?: string
      password?: string
    }
  }
  info?: DockerInfo
}

export interface DockerInfo {
  version: string
  containers: number
  images: number
  os: string
  kernelVersion: string
  cpus: number
  memory: number
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
  Id: string
  ParentId: string
  RepoTags: string[]
  RepoDigests: string[]
  Created: number
  Size: number
  VirtualSize: number
  SharedSize: number
  Labels: { [key: string]: string }
  Containers: number
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

export interface ContainerStats {
  cpu: {
    usage: number
    system: number
    percent: number
  }
  memory: {
    usage: number
    limit: number
    percent: number
  }
  network: {
    rx_bytes: number
    tx_bytes: number
    rx_packets: number
    tx_packets: number
  }
  io: {
    read: number
    write: number
  }
}

// 批量操作类型
export type BatchOperationType = 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause' | 'remove'

// 批量操作结果
export interface BatchOperationResult {
  success: string[]
  failed: Array<{
    id: string
    error: string
  }>
} 