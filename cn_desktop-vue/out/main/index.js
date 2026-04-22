"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
let CONFIG_FILE;
const userDataConfig = path.join(app.getPath("userData"), "config.json");
const appDirConfig = path.join(__dirname, "../../config.json");
if (fs.existsSync(userDataConfig)) {
  CONFIG_FILE = userDataConfig;
} else if (fs.existsSync(appDirConfig)) {
  CONFIG_FILE = appDirConfig;
  if (app.isPackaged) {
    try {
      const configDir = path.dirname(userDataConfig);
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.copyFileSync(appDirConfig, userDataConfig);
      CONFIG_FILE = userDataConfig;
    } catch (copyErr) {
      console.warn("复制配置文件失败:", copyErr.message);
    }
  }
} else {
  CONFIG_FILE = userDataConfig;
}
const DEFAULT_CONFIG = { configList: [], CodingEditPath: "", CodingEditPathList: [] };
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: "#1a1a2e"
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (!app.isPackaged) mainWindow.webContents.openDevTools();
}
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch (e) {
    console.error("加载配置失败:", e);
  }
  return { ...DEFAULT_CONFIG };
}
function saveConfig(config) {
  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("保存配置失败:", e);
    return false;
  }
}
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: 6e4, maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`命令执行失败：${command}
${error.message}`));
        return;
      }
      resolve({ stdout, stderr });
    });
    child.stdout?.on("data", (data) => mainWindow?.webContents.send("command-output", { type: "log", data: data.toString() }));
    child.stderr?.on("data", (data) => mainWindow?.webContents.send("command-output", { type: "log", data: data.toString() }));
  });
}
function checkPathExist(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
function getProjectName(url) {
  const m = url.match(/\/([^\/]+?)(?:\.git)?$/);
  return m ? m[1] : null;
}
async function checkGitRepo(p) {
  try {
    await execPromise(`git -C "${p}" rev-parse --git-dir`);
    return true;
  } catch {
    return false;
  }
}
function checkPackageJson(p) {
  return fs.existsSync(path.join(p, "package.json"));
}
ipcMain.handle("get-config", () => loadConfig());
ipcMain.handle("save-config", (e, config) => saveConfig(config));
ipcMain.handle("select-file", async (e, options = {}) => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters: options.filters || [{ name: "所有文件", extensions: ["*"] }], defaultPath: options.defaultPath || app.getPath("home") });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("select-folder", async (e, options = {}) => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"], defaultPath: options.defaultPath || app.getPath("home") });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("open-with-ide", async (e, { folderPath, idePath }) => {
  try {
    if (!checkPathExist(idePath)) return { success: false, error: `IDE 路径不存在: ${idePath}` };
    if (!checkPathExist(folderPath)) return { success: false, error: `文件夹路径不存在: ${folderPath}` };
    spawn(idePath, [folderPath], { detached: true, stdio: "ignore" }).unref();
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("open-in-explorer", async (e, folderPath) => {
  try {
    shell.openPath(folderPath);
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("git-clone", async (e, { gitUrl, targetDir, branch }) => {
  const projectName = getProjectName(gitUrl);
  const targetPath = path.join(targetDir, projectName);
  try {
    if (!checkPathExist(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    if (checkPathExist(targetPath)) return { success: false, error: `目标路径已存在: ${targetPath}` };
    const cmd = branch ? `git clone -b ${branch} "${gitUrl}" "${targetPath}"` : `git clone "${gitUrl}" "${targetPath}"`;
    await execPromise(cmd, { timeout: 0 });
    return { success: true, targetPath };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("git-switch-branch", async (e, { targetPath, branch }) => {
  try {
    if (!await checkGitRepo(targetPath)) return { success: false, error: "不是 Git 仓库" };
    mainWindow?.webContents.send("command-output", { type: "log", data: `[branch] 正在拉取远程分支信息...
` });
    await execPromise(`cd "${targetPath}" && git fetch origin`);
    const { stdout } = await execPromise(`cd "${targetPath}" && git branch`);
    const locals = stdout.split("\n").map((b) => b.replace(/^\*?\s*/, "").trim());
    try {
      if (locals.includes(branch)) await execPromise(`cd "${targetPath}" && git switch ${branch}`);
      else await execPromise(`cd "${targetPath}" && git switch -c ${branch} origin/${branch}`);
    } catch {
      if (locals.includes(branch)) await execPromise(`cd "${targetPath}" && git checkout ${branch}`, { timeout: 0 });
      else await execPromise(`cd "${targetPath}" && git checkout -b ${branch} origin/${branch}`, { timeout: 0 });
    }
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("npm-install", async (e, { targetPath }) => {
  try {
    if (!checkPackageJson(targetPath)) return { success: false, error: "package.json 不存在" };
    const isWin = process.platform === "win32";
    const cmd = isWin ? `start cmd /c cd /d "${targetPath}" && npm i` : `cd "${targetPath}" && npm i &`;
    await execPromise(cmd, { timeout: 2e4 });
    mainWindow?.webContents.send("command-output", { type: "log", data: `[npm] 已启动安装: ${targetPath}
` });
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("npm-run-dev", async (e, { targetPath }) => {
  try {
    if (!checkPackageJson(targetPath)) return { success: false, error: "package.json 不存在" };
    const isWin = process.platform === "win32";
    const cmd = isWin ? `start cmd /c cd /d "${targetPath}" && npm run dev` : `cd "${targetPath}" && npm run dev &`;
    await execPromise(cmd, { timeout: 1e4 });
    mainWindow?.webContents.send("command-output", { type: "log", data: `[dev] 已后台启动: ${targetPath}
` });
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("clear-node-modules", async (e, { targetPath }) => {
  try {
    if (!checkPathExist(targetPath)) return { success: false, error: "路径不存在" };
    const nodeModulesPath = path.join(targetPath, "node_modules");
    const packageLockPath = path.join(targetPath, "package-lock.json");
    if (process.platform === "win32") {
      try {
        await execPromise(`taskkill /F /IM node.exe 2>nul`, { timeout: 5e3 });
        await sleep(2e3);
      } catch {
      }
    }
    if (checkPathExist(nodeModulesPath)) {
      mainWindow?.webContents.send("command-output", { type: "log", data: `正在删除 node_modules...
` });
      if (process.platform === "win32") {
        let retry = 3;
        while (retry > 0) {
          try {
            await execPromise(`rmdir /s /q "${nodeModulesPath}"`, { timeout: 6e4 });
            break;
          } catch {
            retry--;
            if (retry === 0) return { success: false, error: "删除失败" };
            await sleep(2e3);
          }
        }
      } else {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }
      mainWindow?.webContents.send("command-output", { type: "log", data: `已删除 node_modules
` });
    }
    if (checkPathExist(packageLockPath)) {
      try {
        fs.unlinkSync(packageLockPath);
      } catch {
      }
    }
    try {
      await execPromise("npm cache clean --force", { cwd: targetPath, timeout: 2e4 });
    } catch {
    }
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("git-pull", async (e, { targetPath }) => {
  try {
    if (!await checkGitRepo(targetPath)) return { success: false, error: "不是 Git 仓库" };
    await execPromise(`cd "${targetPath}" && git pull`, { cwd: targetPath });
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("delete-folder", async (e, targetPath) => {
  try {
    if (!checkPathExist(targetPath)) return { success: false, error: "路径不存在" };
    await execPromise(`rmdir /s /q "${targetPath}"`, { timeout: 0 });
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
ipcMain.handle("open-external", async (e, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (e2) {
    return { success: false, error: e2.message };
  }
});
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
