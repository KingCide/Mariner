/**
 * 格式化字节大小
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * 格式化时间戳
 * @param timestamp 时间戳
 * @returns 格式化后的日期字符串
 */
export function formatTimestamp(timestamp: number | string): string {
  return new Date(timestamp).toLocaleString()
}

/**
 * 格式化持续时间
 * @param seconds 秒数
 * @returns 格式化后的持续时间字符串
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时`
  
  const days = Math.floor(hours / 24)
  return `${days}天`
}

/**
 * 格式化端口映射
 * @param port 端口对象
 * @returns 格式化后的端口映射字符串
 */
export function formatPortMapping(port: { privatePort: number; publicPort?: number; type: string }): string {
  if (port.publicPort) {
    return `${port.publicPort}:${port.privatePort}/${port.type}`
  }
  return `${port.privatePort}/${port.type}`
}

/**
 * 格式化容器状态
 * @param status 容器状态
 * @returns 格式化后的状态字符串
 */
export function formatContainerStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'created': '已创建',
    'running': '运行中',
    'paused': '已暂停',
    'restarting': '重启中',
    'removing': '删除中',
    'exited': '已停止',
    'dead': '已死亡'
  }
  
  return statusMap[status] || status
}

/**
 * 格式化容器大小
 * @param size 容器大小对象
 * @returns 格式化后的容器大小字符串
 */
export function formatContainerSize(size: { size: number; virtualSize: number }): string {
  return `${formatBytes(size.size)} (虚拟大小: ${formatBytes(size.virtualSize)})`
}

/**
 * 格式化健康状态
 * @param health 健康状态对象
 * @returns 格式化后的健康状态字符串
 */
export function formatHealthStatus(health: { Status: string; FailingStreak: number }): string {
  const statusMap: Record<string, string> = {
    'healthy': '健康',
    'unhealthy': '不健康',
    'starting': '启动中'
  }
  
  const status = statusMap[health.Status] || health.Status
  if (health.FailingStreak > 0) {
    return `${status} (连续失败: ${health.FailingStreak}次)`
  }
  return status
}

/**
 * 格式化重启策略
 * @param policy 重启策略对象
 * @returns 格式化后的重启策略字符串
 */
export function formatRestartPolicy(policy: { Name: string; MaximumRetryCount: number }): string {
  const policyMap: Record<string, string> = {
    'no': '不重启',
    'always': '始终重启',
    'unless-stopped': '除非手动停止',
    'on-failure': '失败时重启'
  }
  
  const name = policyMap[policy.Name] || policy.Name
  if (policy.Name === 'on-failure' && policy.MaximumRetryCount > 0) {
    return `${name} (最多${policy.MaximumRetryCount}次)`
  }
  return name
} 