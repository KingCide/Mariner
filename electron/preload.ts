import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => func(...args))
    },
    once: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (_event, ...args) => func(...args))
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func)
    }
  }
})
