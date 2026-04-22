import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTerminalStore = defineStore('terminal', () => {
  const logs = ref([])
  const isVisible = ref(false)

  function addLog(text, type = 'info') {
    const time = new Date().toLocaleTimeString()
    logs.value.push({ time, text, type })
    isVisible.value = true
  }

  function clearLogs() { logs.value = [] }
  function show() { isVisible.value = true }
  function hide() { isVisible.value = false }
  function toggle() { isVisible.value = !isVisible.value }

  function initListener() {
    window.electronAPI.onCommandOutput(({ type, data }) => {
      addLog(data, type === 'error' ? 'error' : 'info')
    })
  }

  function removeListener() {
    window.electronAPI.removeCommandOutputListener()
  }

  return { logs, isVisible, addLog, clearLogs, show, hide, toggle, initListener, removeListener }
})
