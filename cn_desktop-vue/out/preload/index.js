"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  selectFolder: (options) => ipcRenderer.invoke("select-folder", options),
  openWithIDE: (folderPath, idePath) => ipcRenderer.invoke("open-with-ide", { folderPath, idePath }),
  openInExplorer: (folderPath) => ipcRenderer.invoke("open-in-explorer", folderPath),
  gitClone: (gitUrl, targetDir, branch) => ipcRenderer.invoke("git-clone", { gitUrl, targetDir, branch }),
  gitSwitchBranch: (targetPath, branch) => ipcRenderer.invoke("git-switch-branch", { targetPath, branch }),
  gitPull: (targetPath) => ipcRenderer.invoke("git-pull", { targetPath }),
  npmInstall: (targetPath) => ipcRenderer.invoke("npm-install", { targetPath }),
  npmRunDev: (targetPath) => ipcRenderer.invoke("npm-run-dev", { targetPath }),
  clearNodeModules: (targetPath) => ipcRenderer.invoke("clear-node-modules", { targetPath }),
  deleteFolder: (targetPath) => ipcRenderer.invoke("delete-folder", targetPath),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onCommandOutput: (callback) => ipcRenderer.on("command-output", (e, data) => callback(data)),
  removeCommandOutputListener: () => ipcRenderer.removeAllListeners("command-output")
});
