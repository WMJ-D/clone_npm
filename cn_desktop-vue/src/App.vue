<template>
  <div class="app-container">
    <router-view />
    <!-- Toast 提示 -->
    <transition name="fade">
      <div v-if="toast.visible" :class="['toast', toast.type]">{{ toast.message }}</div>
    </transition>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useTerminalStore } from './stores/terminal'
import { onUnmounted } from 'vue'

// Toast 状态和方法（直接放在 App.vue）
const toast = reactive({
  visible: false,
  message: '',
  type: 'success'
})

function showToast(msg, type = 'success', duration = 3000) {
  toast.message = msg
  toast.type = type
  toast.visible = true
  setTimeout(() => { toast.visible = false }, duration)
}

// 挂载到全局
window.__toast = showToast

const terminalStore = useTerminalStore()
terminalStore.initListener()

onUnmounted(() => {
  terminalStore.removeListener()
})
</script>

<style lang="scss">
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; overflow: hidden; }
.app-container { width: 100%; height: 100vh; overflow: hidden; }

.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.toast.success { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.toast.error { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.toast.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.toast.info { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
</style>
