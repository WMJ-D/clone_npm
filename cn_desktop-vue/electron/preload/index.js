const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectFolder: (options) => ipcRenderer.invoke('select-folder', options),
  openWithIDE: (folderPath, idePath) => ipcRenderer.invoke('open-with-ide', { folderPath, idePath }),
  openInExplorer: (folderPath) => ipcRenderer.invoke('open-in-explorer', folderPath),
  gitClone: (gitUrl, targetDir, branch) => ipcRenderer.invoke('git-clone', { gitUrl, targetDir, branch }),
  gitSwitchBranch: (targetPath, branch) => ipcRenderer.invoke('git-switch-branch', { targetPath, branch }),
  gitPull: (targetPath) => ipcRenderer.invoke('git-pull', { targetPath }),
  npmInstall: (targetPath) => ipcRenderer.invoke('npm-install', { targetPath }),
  npmRunDev: (targetPath) => ipcRenderer.invoke('npm-run-dev', { targetPath }),
  clearNodeModules: (targetPath) => ipcRenderer.invoke('clear-node-modules', { targetPath }),
  deleteFolder: (targetPath) => ipcRenderer.invoke('delete-folder', targetPath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onCommandOutput: (callback) => ipcRenderer.on('command-output', (e, data) => callback(data)),
  removeCommandOutputListener: () => ipcRenderer.removeAllListeners('command-output'),
  // 终端 PTY API
  terminalWrite: (termId, data) => ipcRenderer.invoke('terminal-write', { termId, data }),
  terminalResize: (termId, cols, rows) => ipcRenderer.invoke('terminal-resize', { termId, cols, rows }),
  terminalClose: (termId) => ipcRenderer.invoke('terminal-close', { termId }),
  onTerminalData: (callback) => ipcRenderer.on('terminal-data', (e, data) => callback(data)),
  onTerminalExit: (callback) => ipcRenderer.on('terminal-exit', (e, data) => callback(data)),
  removeTerminalListeners: () => {
    ipcRenderer.removeAllListeners('terminal-data')
    ipcRenderer.removeAllListeners('terminal-exit')
  },
  // 博客服务器 API
  blogGetStatus: () => ipcRenderer.invoke('blog-get-status'),
  blogStart: (port) => ipcRenderer.invoke('blog-start', { port }),
  blogStop: () => ipcRenderer.invoke('blog-stop'),
  blogTestDb: () => ipcRenderer.invoke('blog-test-db'),
  blogUpdateDbConfig: (config) => ipcRenderer.invoke('blog-update-db-config', { config }),
})
