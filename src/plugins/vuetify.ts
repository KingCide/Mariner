import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  defaults: {
    VTextField: {
      color: 'secondary',
      variant: 'outlined',
      density: 'compact',
    },
    VTextarea: {
      color: 'secondary',
      variant: 'outlined',
      density: 'compact',
    },
    VSelect: {
      color: 'secondary',
      variant: 'outlined',
      density: 'compact',
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#673ab7',
          secondary: '#2196f3',
          'primary-darken-1': '#5e35b1',
          'secondary-darken-1': '#1976d2',
          background: '#ffffff',
          surface: '#f5f5f5',
        }
      },
      dark: {
        colors: {
          primary: '#9575cd',
          secondary: '#64b5f6',
          'primary-darken-1': '#7e57c2',
          'secondary-darken-1': '#42a5f5',
          background: '#121212',
          surface: '#1e1e1e',
        }
      }
    }
  }
}) 