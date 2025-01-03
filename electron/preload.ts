import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electron', {
  // IPC 通信
  ipcRenderer: {
    // 调用主进程方法并等待结果
    invoke: (channel: string, ...args: any[]) => {
      return ipcRenderer.invoke(channel, ...args)
    },
    // 发送消息给主进程
    send: (channel: string, ...args: any[]) => {
      ipcRenderer.send(channel, ...args)
    },
    // 监听主进程消息
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
      return () => {
        ipcRenderer.removeListener(channel, callback)
      }
    },
    // 监听一次性消息
    once: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (_, ...args) => callback(...args))
    }
  }
})
