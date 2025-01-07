<template>
  <v-dialog
    :model-value="modelValue"
    width="680"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="host-dialog" elevation="0">
      <v-card-title class="px-4 py-3 bg-primary d-flex align-center">
        <span class="text-h6 font-weight-medium text-white">添加Docker主机</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="$emit('update:modelValue', false)"
        ></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-tabs
          v-model="activeTab"
          color="primary"
          align-tabs="start"
          class="mb-4"
        >
          <v-tab value="ssh" class="text-body-1">
            <v-icon start size="small">mdi-ssh</v-icon>
            SSH连接
          </v-tab>
          <v-tab value="tcp" class="text-body-1">
            <v-icon start size="small">mdi-lan-connect</v-icon>
            TCP连接
          </v-tab>
          <v-tab value="local" class="text-body-1">
            <v-icon start size="small">mdi-desktop-tower</v-icon>
            本地Docker
          </v-tab>
        </v-tabs>

        <v-window v-model="activeTab">
          <v-window-item value="ssh">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <SSHConfigForm @saved="handleSaved" />
            </v-card>
          </v-window-item>

          <v-window-item value="tcp">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <TCPConfigForm @saved="handleSaved" />
            </v-card>
          </v-window-item>

          <v-window-item value="local">
            <v-card flat class="rounded-lg pa-3 bg-grey-lighten-5">
              <LocalConfigForm @saved="handleSaved" />
            </v-card>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SSHConfigForm from './SSHConfigForm.vue'
import TCPConfigForm from './TCPConfigForm.vue'
import LocalConfigForm from './LocalConfigForm.vue'

// 定义 props
const props = defineProps<{
  modelValue: boolean
}>()

// 定义 emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const activeTab = ref('ssh')

const handleClose = (val: boolean) => {
  if (!val) {
    activeTab.value = 'ssh'
  }
}

const handleSaved = () => {
  emit('saved')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.host-dialog {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.v-field) {
  border-radius: 8px !important;
}

:deep(.v-input) {
  --v-input-control-height: 40px;
}

:deep(.v-btn) {
  text-transform: none;
  letter-spacing: normal;
}

:deep(.v-card) {
  border-radius: 8px;
}
</style> 