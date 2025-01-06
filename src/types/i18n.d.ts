import 'vue-i18n'

declare module 'vue-i18n' {
  export interface DefineLocaleMessage {
    settings: {
      title: string
      general: {
        title: string
        theme: string
        light: string
        dark: string
        system: string
        language: string
        autoUpdate: string
        autoStart: string
      }
      docker: {
        title: string
        registry: string
        pullPolicy: string
        always: string
        ifnotpresent: string
        never: string
        logMaxSize: string
        logMaxFiles: string
      }
      terminal: {
        title: string
        fontFamily: string
        fontSize: string
        lineHeight: string
        cursorStyle: string
        block: string
        underline: string
        bar: string
        cursorBlink: string
      }
      proxy: {
        title: string
        enabled: string
        host: string
        port: string
        username: string
        password: string
        noProxy: string
        hostPlaceholder: string
        usernamePlaceholder: string
        passwordPlaceholder: string
        noProxyPlaceholder: string
      }
    }
    common: {
      save: string
      cancel: string
    }
  }
} 