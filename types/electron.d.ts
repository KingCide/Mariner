export interface IpcRenderer {
  invoke(channel: string, ...args: any[]): Promise<any>
  send(channel: string, ...args: any[]): void
  on(channel: string, callback: (...args: any[]) => void): () => void
  once(channel: string, callback: (...args: any[]) => void): void
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: IpcRenderer
    }
  }
} 