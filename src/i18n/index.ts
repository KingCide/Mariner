import { createI18n } from 'vue-i18n'

const messages = {
  'zh-CN': {
    settings: {
      title: '设置',
      general: {
        title: '常规',
        theme: '主题',
        light: '浅色',
        dark: '深色',
        system: '跟随系统',
        language: '语言',
        autoUpdate: '自动检查更新',
        autoStart: '开机自启'
      },
      docker: {
        title: 'Docker',
        registry: '默认镜像仓库',
        pullPolicy: '镜像拉取策略',
        always: '总是拉取',
        ifnotpresent: '不存在时拉取',
        never: '从不拉取',
        logMaxSize: '容器日志大小',
        logMaxFiles: '日志文件数量'
      },
      terminal: {
        title: '终端',
        fontFamily: '字体',
        fontSize: '字体大小',
        lineHeight: '行高',
        cursorStyle: '光标样式',
        block: '块状',
        underline: '下划线',
        bar: '竖线',
        cursorBlink: '光标闪烁'
      },
      proxy: {
        title: '代理',
        enabled: '启用代理',
        host: '代理服务器',
        port: '端口',
        username: '用户名',
        password: '密码',
        noProxy: '不使用代理',
        hostPlaceholder: '例如：127.0.0.1',
        usernamePlaceholder: '可选',
        passwordPlaceholder: '可选',
        noProxyPlaceholder: '每行一个地址，支持通配符 *'
      }
    },
    common: {
      save: '保存',
      cancel: '取消'
    }
  },
  'en-US': {
    settings: {
      title: 'Settings',
      general: {
        title: 'General',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        language: 'Language',
        autoUpdate: 'Auto Check Updates',
        autoStart: 'Start on Boot'
      },
      docker: {
        title: 'Docker',
        registry: 'Default Registry',
        pullPolicy: 'Pull Policy',
        always: 'Always',
        ifnotpresent: 'If Not Present',
        never: 'Never',
        logMaxSize: 'Container Log Size',
        logMaxFiles: 'Log Files Count'
      },
      terminal: {
        title: 'Terminal',
        fontFamily: 'Font Family',
        fontSize: 'Font Size',
        lineHeight: 'Line Height',
        cursorStyle: 'Cursor Style',
        block: 'Block',
        underline: 'Underline',
        bar: 'Bar',
        cursorBlink: 'Cursor Blink'
      },
      proxy: {
        title: 'Proxy',
        enabled: 'Enable Proxy',
        host: 'Proxy Server',
        port: 'Port',
        username: 'Username',
        password: 'Password',
        noProxy: 'No Proxy',
        hostPlaceholder: 'e.g. 127.0.0.1',
        usernamePlaceholder: 'Optional',
        passwordPlaceholder: 'Optional',
        noProxyPlaceholder: 'One address per line, wildcard * supported'
      }
    },
    common: {
      save: 'Save',
      cancel: 'Cancel'
    }
  }
}

export const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages,
  legacy: false
}) 