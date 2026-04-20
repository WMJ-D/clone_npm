const { contextBridge, ipcRenderer } = require('electron');

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 配置管理
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 文件选择
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectFolder: (options) => ipcRenderer.invoke('select-folder', options),

  // IDE 操作
  openWithIDE: (folderPath, idePath) =>
    ipcRenderer.invoke('open-with-ide', { folderPath, idePath }),
  openInExplorer: (folderPath) =>
    ipcRenderer.invoke('open-in-explorer', folderPath),

  // Git 操作
  gitClone: (gitUrl, targetDir, branch) =>
    ipcRenderer.invoke('git-clone', { gitUrl, targetDir, branch }),
  gitSwitchBranch: (targetPath, branch) =>
    ipcRenderer.invoke('git-switch-branch', { targetPath, branch }),
  gitPull: (targetPath) =>
    ipcRenderer.invoke('git-pull', { targetPath }),

  // npm 操作
  npmInstall: (targetPath) =>
    ipcRenderer.invoke('npm-install', { targetPath }),
  npmRunDev: (targetPath) =>
    ipcRenderer.invoke('npm-run-dev', { targetPath }),
  clearNodeModules: (targetPath) =>
    ipcRenderer.invoke('clear-node-modules', { targetPath }),

  // 文件操作
  deleteFolder: (targetPath) =>
    ipcRenderer.invoke('delete-folder', targetPath),

  // 外部链接
  openExternal: (url) =>
    ipcRenderer.invoke('open-external', url),

  // 监听命令输出（实时日志）
  onCommandOutput: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('command-output', handler);
    return () => ipcRenderer.removeListener('command-output', handler);
  }
});
