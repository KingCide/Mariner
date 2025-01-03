<template>
  <el-dialog
    v-model="visible"
    title="容器终端"
    width="800px"
    :close-on-click-modal="false"
    class="container-terminal-dialog"
    @closed="handleClosed"
  >
    <div class="toolbar">
      <div class="shell-select">
        <span class="label">Shell:</span>
        <el-select
          v-model="selectedShell"
          size="small"
          @change="handleShellChange"
        >
          <el-option label="sh" value="sh" />
          <el-option label="bash" value="bash" />
          <el-option label="ash" value="ash" />
        </el-select>
      </div>
      <div class="actions">
        <el-button size="small" @click="handleClear">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button size="small">
            <el-icon><Setting /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制选中内容</el-dropdown-item>
              <el-dropdown-item command="paste">粘贴</el-dropdown-item>
              <el-dropdown-item divided command="fontIncrease">增大字体</el-dropdown-item>
              <el-dropdown-item command="fontDecrease">减小字体</el-dropdown-item>
              <el-dropdown-item divided command="reconnect">重新连接</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div ref="terminalRef" class="terminal-container" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Setting } from '@element-plus/icons-vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { SearchAddon } from 'xterm-addon-search'
import { useDockerStore } from '../../stores/dockerStore'
import 'xterm/css/xterm.css'

const props = defineProps<{
  containerId: string
}>()

const dockerStore = useDockerStore()
const visible = ref(false)
const selectedShell = ref('sh')
const terminalRef = ref<HTMLElement>()

// xterm 实例
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let searchAddon: SearchAddon | null = null

// 终端连接
let terminalConnection: any = null

// 打开对话框
const open = () => {
  visible.value = true
  // 延迟初始化终端，等待 DOM 渲染完成
  setTimeout(() => {
    initTerminal()
  }, 100)
}

// 初始化终端
const initTerminal = () => {
  if (!terminalRef.value) return

  // 创建终端实例
  terminal = new Terminal({
    fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: 'block',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    }
  })

  // 添加插件
  fitAddon = new FitAddon()
  searchAddon = new SearchAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())
  terminal.loadAddon(searchAddon)

  // 打开终端
  terminal.open(terminalRef.value)
  fitAddon.fit()

  // 连接到容器
  connectToContainer()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 连接到容器
const connectToContainer = async () => {
  if (!terminal || !props.containerId) return

  try {
    // 断开现有连接
    if (terminalConnection) {
      terminalConnection.destroy()
      terminalConnection = null
    }

    // 创建新连接
    terminalConnection = await dockerStore.createTerminalConnection(
      props.containerId,
      selectedShell.value,
      {
        onData: (data: string) => {
          terminal?.write(data)
        },
        onClose: () => {
          terminal?.write('\r\n\x1b[1;31m会话已断开\x1b[0m\r\n')
        }
      }
    )

    // 监听用户输入
    terminal.onData((data) => {
      terminalConnection?.write(data)
    })
  } catch (error) {
    console.error('Failed to connect to container:', error)
    ElMessage.error('连接容器失败')
  }
}

// 处理窗口大小变化
const handleResize = () => {
  fitAddon?.fit()
  // 发送新的终端大小到容器
  if (terminalConnection && terminal) {
    const { rows, cols } = terminal
    terminalConnection.resize(cols, rows)
  }
}

// 处理 Shell 变化
const handleShellChange = () => {
  connectToContainer()
}

// 清空终端
const handleClear = () => {
  terminal?.clear()
}

// 处理下拉菜单命令
const handleCommand = (command: string) => {
  if (!terminal) return

  switch (command) {
    case 'copy':
      const selection = terminal.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection)
      }
      break
    case 'paste':
      navigator.clipboard.readText()
        .then((text) => {
          terminalConnection?.write(text)
        })
        .catch(() => {
          ElMessage.error('无法访问剪贴板')
        })
      break
    case 'fontIncrease':
      terminal.options.fontSize = (terminal.options.fontSize || 14) + 1
      fitAddon?.fit()
      break
    case 'fontDecrease':
      terminal.options.fontSize = Math.max((terminal.options.fontSize || 14) - 1, 8)
      fitAddon?.fit()
      break
    case 'reconnect':
      connectToContainer()
      break
  }
}

// 关闭对话框时清理
const handleClosed = () => {
  if (terminalConnection) {
    terminalConnection.destroy()
    terminalConnection = null
  }
  if (terminal) {
    terminal.dispose()
    terminal = null
  }
  window.removeEventListener('resize', handleResize)
}

// 组件卸载时清理
onUnmounted(() => {
  handleClosed()
})

// 暴露组件方法
defineExpose({
  open
})
</script>

<style scoped>
.container-terminal-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.toolbar {
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shell-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shell-select .label {
  color: #909399;
}

.shell-select :deep(.el-select) {
  width: 100px;
}

.actions {
  display: flex;
  gap: 8px;
}

.terminal-container {
  height: 500px;
  background-color: #1e1e1e;
  border-radius: 4px;
  padding: 8px;
}

.terminal-container :deep(.xterm) {
  padding: 8px;
}
</style> 