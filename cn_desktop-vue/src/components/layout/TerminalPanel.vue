<template>
  <div :class="['terminal-panel', { hidden: !terminalStore.isVisible }]" >
    <div class="terminal-header">
      <span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        终端
      </span>
      <div>
        <el-button size="small" @click="clearTerminal">清空</el-button>
        <el-button size="small" @click="terminalStore.hide">关闭</el-button>
      </div>
    </div>
    <div ref="terminalContainer" class="terminal-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useTerminalStore } from '@/stores/terminal'
import 'xterm/css/xterm.css'

const terminalStore = useTerminalStore()
const terminalContainer = ref(null)
let terminal = null
let fitAddon = null

onMounted(async () => {
  await nextTick()
  initTerminal()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (terminal) {
    terminal.dispose()
  }
  window.electronAPI.removeTerminalListeners()
})

watch(() => terminalStore.isVisible, async (visible) => {
  if (visible) {
    await nextTick()
    setTimeout(() => {
        handleResize()
        terminal?.focus()
    }, 2000);
  }
})

function initTerminal() {
  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 13,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      cursor: '#ffffff',
      selectionBackground: '#264f78'
    },
    scrollback: 1000,
    convertEol: true
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(terminalContainer.value)
  fitAddon.fit()

  // 监听终端输入
  terminal.onData((data) => {
    if (terminalStore.currentTermId !== null) {
      window.electronAPI.terminalWrite(terminalStore.currentTermId, data)
    }
  })

  // 监听主进程 PTY 输出
  window.electronAPI.onTerminalData(({ termId, data }) => {
    if (termId === terminalStore.currentTermId && terminal) {
      terminal.write(data)
    }
  })

  // 监听终端退出
  window.electronAPI.onTerminalExit(({ termId, exitCode }) => {
    if (termId === terminalStore.currentTermId) {
      terminal.writeln(`\r\n[进程已退出，退出码: ${exitCode}]`)
      terminal.write('$ ')
      terminalStore.currentTermId = null
    }
  })

  terminal.write('$ ')
}

function handleResize() {
  if (fitAddon && terminal) {
    fitAddon.fit()
    const { cols, rows } = terminal
    if (terminalStore.currentTermId !== null) {
      window.electronAPI.terminalResize(terminalStore.currentTermId, cols, rows)
    }
  }
}

function clearTerminal() {
  if (terminal) {
    terminal.clear()
    terminal.write('$ ')
  }
}
</script>

<style lang="scss" scoped>
.terminal-panel {
  width: 450px;
  background: #0d1117;
  border-left: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  &.hidden {
    width: 0;
    overflow: hidden;
    opacity: 0;
  }
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #161b22;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  font-size: 13px;
  span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #c9d1d9;
  }
}

.terminal-container {
  flex: 1;
  padding: 8px;
  overflow: hidden;
  min-height: 200px;
  
  :deep(.xterm) {
    padding: 0;
    height: 100%;
  }
  
  :deep(.xterm-viewport) {
    overflow-y: auto !important;
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
    }
  }
}
</style>
