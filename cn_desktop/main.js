const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 优先读取应用根目录下的 config.json，其次用户数据目录
let CONFIG_FILE;
try {
  // 开发模式：使用 __dirname 下的 config.json
  const localConfig = path.join(__dirname, 'config.json');
  if (fs.existsSync(localConfig)) {
    CONFIG_FILE = localConfig;
  } else {
    // 打包后：使用用户数据目录
    CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
  }
} catch (e) {
  CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
}

// 默认配置（兼容原 config.json 结构）
const DEFAULT_CONFIG = {
  configList: [],
  CodingEditPath: '',
  CodingEditPathList: []
};

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 打开开发者工具（调试用）
  // mainWindow.webContents.openDevTools();
}

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载配置失败:', e);
  }
  return { ...DEFAULT_CONFIG };
}

// 保存配置
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('保存配置失败:', e);
    return false;
  }
}

/**
 * 封装带 Promise 的 exec（对齐原代码 execPromise1）
 * 增加超时和错误详情
 */
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: 60000, maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.message = `命令执行失败：${command}\n错误详情：${error.message}\nstdout：${stdout}\nstderr：${stderr}`;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });

    // 实时输出日志到渲染进程（通过 stdout/stderr 流）
    child.stdout && child.stdout.on('data', (data) => {
      mainWindow?.webContents.send('command-output', { type: 'log', data: data.toString() });
    });
    child.stderr && child.stderr.on('data', (data) => {
      mainWindow?.webContents.send('command-output', { type: 'log', data: data.toString() });
    });
  });
}

// 检查路径是否存在
function checkPathExist(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

// 获取项目名称
function getProjectName(gitUrl) {
  const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

// 检查是否为 Git 仓库
async function checkGitRepo(targetPath) {
  try {
    await execPromise(`git -C "${targetPath}" rev-parse --git-dir`);
    return true;
  } catch {
    return false;
  }
}

// 检查是否有 package.json
function checkPackageJson(targetPath) {
  return fs.existsSync(path.join(targetPath, 'package.json'));
}

// ==================== IPC Handlers ====================

// 获取配置
ipcMain.handle('get-config', async () => {
  return loadConfig();
});

// 保存配置
ipcMain.handle('save-config', async (event, config) => {
  return saveConfig(config);
});

// 选择文件（IDE路径等）
ipcMain.handle('select-file', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters || [{ name: '所有文件', extensions: ['*'] }],
    defaultPath: options.defaultPath || app.getPath('home')
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 选择文件夹
ipcMain.handle('select-folder', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: options.defaultPath || app.getPath('home')
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 用 IDE 打开文件夹
ipcMain.handle('open-with-ide', async (event, { folderPath, idePath }) => {
  try {
    if (!checkPathExist(idePath)) {
      return { success: false, error: `IDE 路径不存在: ${idePath}` };
    }
    if (!checkPathExist(folderPath)) {
      return { success: false, error: `文件夹路径不存在: ${folderPath}` };
    }
    const child = spawn(idePath, [folderPath], { detached: true, stdio: 'ignore' });
    child.unref();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 用资源管理器打开文件夹
ipcMain.handle('open-in-explorer', async (event, folderPath) => {
  try {
    shell.openPath(folderPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * 执行 git clone
 * 对齐原代码：execSync(`git clone ${gitUrl} "${finalProjectDir}"`, { stdio: 'inherit' })
 */
ipcMain.handle('git-clone', async (event, { gitUrl, targetDir, branch }) => {
  const projectName = getProjectName(gitUrl);
  const targetPath = path.join(targetDir, projectName);

  try {
    // 检查目标目录是否存在
    if (!checkPathExist(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 检查是否已存在
    if (checkPathExist(targetPath)) {
      return { success: false, error: `目标路径已存在: ${targetPath}` };
    }

    // 构建命令（对齐原代码格式）
    let cloneCmd = branch
      ? `git clone -b ${branch} "${gitUrl}" "${targetPath}"`
      : `git clone "${gitUrl}" "${targetPath}"`;

    await execPromise(cloneCmd, { timeout: 0 });
    return { success: true, targetPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * 切换分支
 * 对齐原代码 switchBranch() 函数：
 *   1. git fetch origin（拉取远程分支信息）
 *   2. 优先 git switch，兼容旧版 git checkout
 *   3. 本地分支判断 + 远程分支创建
 */
ipcMain.handle('git-switch-branch', async (event, { targetPath, branch }) => {
  try {
    const isRepo = await checkGitRepo(targetPath);
    if (!isRepo) {
      return { success: false, error: '不是 Git 仓库' };
    }

    // Step 1: git fetch origin（拉取远程最新分支信息）
    mainWindow?.webContents.send('command-output', { type: 'log', data: `[branch] 正在拉取远程分支信息...\n` });
    await execPromise(`cd "${targetPath}" && git fetch origin`);

    // Step 2: 获取本地分支列表
    const { stdout: branchesOutput } = await execPromise(`cd "${targetPath}" && git branch`);
    const localBranches = branchesOutput.split('\n').map(b => b.replace(/^\*?\s*/, '').trim());

    let switchResult;

    // Step 3: 尝试切换分支（双策略：优先 git switch，降级 git checkout）
    try {
      if (localBranches.includes(branch)) {
        mainWindow?.webContents.send('command-output', { type: 'log', data: `[branch] 本地存在分支 ${branch}，直接切换\n` });
        await execPromise(`cd "${targetPath}" && git switch ${branch}`);
      } else {
        mainWindow?.webContents.send('command-output', { type: 'log', data: `[branch] 本地不存在分支 ${branch}，从远程拉取并切换\n` });
        await execPromise(`cd "${targetPath}" && git switch -c ${branch} origin/${branch}`);
      }
    } catch (switchErr) {
      // 兼容旧版本 Git（无 git switch 命令），使用 git checkout 降级
      mainWindow?.webContents.send('command-output', { type: 'log', data: `[branch] git switch 不支持，尝试 git checkout...\n` });
      try {
        if (localBranches.includes(branch)) {
          await execPromise(`cd "${targetPath}" && git checkout ${branch}`, { timeout: 0 });
        } else {
          await execPromise(`cd "${targetPath}" && git checkout -b ${branch} origin/${branch}`, { timeout: 0 });
        }
      } catch (checkoutErr) {
        throw new Error(`切换分支失败：${checkoutErr.message}`);
      }
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * npm install（打开 cmd 窗口执行，不阻塞主进程）
 * Windows: start cmd /k 保持窗口打开查看进度
 */
ipcMain.handle('npm-install', async (event, { targetPath }) => {
  try {
    if (!checkPackageJson(targetPath)) {
      return { success: false, error: 'package.json 不存在' };
    }

    const isWin = process.platform === 'win32';
    const command = isWin
      ? `cd "${targetPath}" && start cmd /k npm i`
      : `cd "${targetPath}" && npm i &`;

    await execPromise(command);
    mainWindow?.webContents.send('command-output', { type: 'log', data: `[npm] 已启动安装: ${targetPath}\n` });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * npm run dev（后台启动，不阻塞）
 * 对齐原代码：Windows 用 start cmd /k，Mac/Linux 用 &
 */
ipcMain.handle('npm-run-dev', async (event, { targetPath }) => {
  try {
    if (!checkPackageJson(targetPath)) {
      return { success: false, error: 'package.json 不存在' };
    }

    // Windows：后台启动（start cmd /k 保持窗口打开查看日志）
    const isWin = process.platform === 'win32';
    const command = isWin
      ? `cd "${targetPath}" && start cmd /k npm run dev`
      : `cd "${targetPath}" && npm run dev &`;

    await execPromise(command);
    mainWindow?.webContents.send('command-output', { type: 'log', data: `[dev] 已后台启动: ${targetPath}\n` });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * 清除 node_modules + package-lock.json + npm cache clean
 * 对齐原代码 handleSingleProject()：
 *   - 删除 node_modules 目录
 *   - 删除 package-lock.json 文件
 *   - execSync('npm cache clean --force')
 */
ipcMain.handle('clear-node-modules', async (event, { targetPath }) => {
  try {
    if (!checkPathExist(targetPath)) {
      return { success: false, error: '路径不存在' };
    }

    const nodeModulesPath = path.join(targetPath, 'node_modules');
    const packageLockPath = path.join(targetPath, 'package-lock.json');

    // 先杀掉目标目录下的 node 进程（避免 npm run dev 占用导致删除失败）
    if (process.platform === 'win32') {
      try {
        mainWindow?.webContents.send('command-output', { type: 'log', data: `正在停止 ${targetPath} 下的 node 进程...\n` });
        // 用 taskkill 杀掉在该目录下运行的 node 进程
        await execPromise(`for /f "tokens=2" %a in ('wmic process where "name='node.exe'" get ProcessId 2^>nul ^| findstr /r "[0-9]"') do taskkill /PID %a /F >nul 2>&1`, { timeout: 10000 });
        mainWindow?.webContents.send('command-output', { type: 'log', data: `node 进程已停止\n` });
        await sleep(1500); // 等待进程释放文件句柄
      } catch (killErr) {
        mainWindow?.webContents.send('command-output', { type: 'log', data: `停止进程时出错（可忽略）: ${killErr.message}\n` });
      }
    }

    // 删除 node_modules
    if (checkPathExist(nodeModulesPath)) {
      fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      mainWindow?.webContents.send('command-output', { type: 'log', data: `已删除 node_modules\n` });
    } else {
      mainWindow?.webContents.send('command-output', { type: 'log', data: `node_modules 不存在，跳过\n` });
    }

    // 删除 package-lock.json
    if (checkPathExist(packageLockPath)) {
      fs.unlinkSync(packageLockPath);
      mainWindow?.webContents.send('command-output', { type: 'log', data: `已删除 package-lock.json\n` });
    } else {
      mainWindow?.webContents.send('command-output', { type: 'log', data: `package-lock.json 不存在，跳过\n` });
    }

    // npm cache clean --force（对齐原代码）
    mainWindow?.webContents.send('command-output', { type: 'log', data: `正在清除 npm 缓存...\n` });
    await execPromise('npm cache clean --force', { cwd: targetPath, timeout: 0 });
    mainWindow?.webContents.send('command-output', { type: 'log', data: `npm 缓存已清除\n` });

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/**
 * git pull
 * 对齐原代码：await execPromise1(`cd "${projectPath}" && git pull`)
 */
ipcMain.handle('git-pull', async (event, { targetPath }) => {
  try {
    const isRepo = await checkGitRepo(targetPath);
    if (!isRepo) {
      return { success: false, error: '不是 Git 仓库' };
    }

    // 对齐原代码：cd 到目标目录后执行 git pull
    await execPromise(`cd "${targetPath}" && git pull`, { cwd: targetPath });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 删除文件夹
ipcMain.handle('delete-folder', async (event, targetPath) => {
  try {
    if (!checkPathExist(targetPath)) {
      return { success: false, error: '路径不存在' };
    }

    // Windows 下使用 rmdir
    await execPromise(`rmdir /s /q "${targetPath}"`, { timeout: 0 });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 打开外部链接
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ==================== App Lifecycle ====================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
