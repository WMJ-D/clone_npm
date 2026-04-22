<template>
  <div :class="['terminal-panel', { hidden: !terminalStore.isVisible }]">
    <div class="terminal-header">
      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> 命令执行日志</span>
      <div>
        <el-button size="small" @click="terminalStore.hide">关闭</el-button>
        <el-button size="small" @click="terminalStore.clearLogs">清空</el-button>
      </div>
    </div>
    <div class="log" ref="logRef">
      <div v-for="(log, i) in terminalStore.logs" :key="i" :class="['log-item', log.type]">
        <span class="time">[{{ log.time }}]</span> {{ log.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useTerminalStore } from '@/stores/terminal'

const terminalStore = useTerminalStore()
const logRef = ref(null)

watch(() => terminalStore.logs.length, () => {
  nextTick(() => {
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  })
})
</script>

<style lang="scss" scoped>
.terminal-panel {
  width: 400px; background: #0d1117; border-left: 1px solid rgba(255,255,255,0.1);
  display: flex; flex-direction: column; transition: all 0.3s;
  &.hidden { width: 0; overflow: hidden; opacity: 0; }
}

.terminal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: #161b22; border-bottom: 1px solid rgba(255,255,255,0.1);
  font-size: 13px; span { display: flex; align-items: center; gap: 8px; }
}

.log {
  flex: 1; overflow-y: auto; padding: 12px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
}

.log-item {
  padding: 2px 0; white-space: pre-wrap; word-break: break-all; line-height: 1.6;
  &.info { color: #c9d1d9; }
  &.success { color: #3fb950; }
  &.error { color: #f85149; }
  &.warning { color: #d29922; }
  .time { color: #6e7681; margin-right: 8px; }
}
</style>
