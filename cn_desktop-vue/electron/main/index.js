const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, exec } = require('child_process')
const pty = require('node-pty')

// 判断是否为开发模式
const isDev = !app.isPackaged

// PTY 终端管理
const terminals = new Map()
let terminalIdCounter = 0

// 持久终端会话
let mainTerminal = null
let mainTermId = null

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// 获取或创建持久终端
function getMainTerminal() {
  if (mainTerminal && !mainTerminal.killed) {
    return { terminal: mainTerminal, termId: mainTermId }
  }

  const termId = terminalIdCounter++
  const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash'

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    env: process.env
  })

  terminals.set(termId, ptyProcess)
  mainTerminal = ptyProcess
  mainTermId = termId

  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', { termId, data })
    }
  })

  ptyProcess.onExit(({ exitCode }) => {
    terminals.delete(termId)
    if (mainTermId === termId) {
      mainTerminal = null
      mainTermId = null
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-exit', { termId, exitCode })
    }
  })

  return { terminal: ptyProcess, termId }
}

// 获取正确的 config.json 路径
function getConfigFile() {
  const userDataConfig = path.join(app.getPath('userData'), 'config.json')
  
  // 打包后 extraResources 在 process.resourcesPath 下
  const extraResourcesConfig = isDev
    ? null
    : path.join(process.resourcesPath, 'config.json')
  
  // 开发时: electron/main/ -> 项目根目录
  const devConfig = path.join(__dirname, '../../config.json')
  console.log("🚀 ~ getConfigFile ~ devConfig:", devConfig)

  // 优先级：用户目录 > extraResources(打包) > dev配置(开发)
  if (!isDev && fs.existsSync(userDataConfig)) {
    return userDataConfig
  }
  
  if (!isDev && extraResourcesConfig && fs.existsSync(extraResourcesConfig)) {
    // 打包后首次运行，复制到用户目录
    try {
      const configDir = path.dirname(userDataConfig)
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
      fs.copyFileSync(extraResourcesConfig, userDataConfig)
      console.log('[Config] 从 extraResources 复制到用户目录')
      return userDataConfig
    } catch (copyErr) {
      console.warn('复制配置文件失败:', copyErr.message)
      return extraResourcesConfig
    }
  }
  
  if (isDev && fs.existsSync(devConfig)) {
    return devConfig
  }
  
  return userDataConfig
}

let CONFIG_FILE
let configLoaded = false

const DEFAULT_CONFIG = { configList: [], CodingEditPath: '', CodingEditPathList: [] }
let mainWindow = null

function loadConfigFile() {
  if (!configLoaded) {
    CONFIG_FILE = getConfigFile()
    configLoaded = true
    console.log('[Config] 配置文件路径:', CONFIG_FILE)
  }
  return CONFIG_FILE
}

function createWindow() {
  // 图标路径
  const iconPath = isDev
    ? path.join(__dirname, '../../resources/icon.ico')
    : path.join(process.resourcesPath, 'resources/icon.ico')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      partition: 'persist:main'  // 共享 Cookie 存储
    },
    show: false,
    backgroundColor: '#1a1a2e'
  })

  // 开发时使用 Vite dev server，打包后使用文件
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    // 开发: electron/main/ -> out/renderer/index.html
    // 打包: app.asar/main/ -> app.asar/out/renderer/index.html
    const rendererPath = isDev
      ? path.join(__dirname, '../../renderer/index.html')
      : path.join(__dirname, '../renderer/index.html')
    mainWindow.loadFile(rendererPath)
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })

  if (isDev) mainWindow.webContents.openDevTools()
}

function loadConfig() {
  try {
    const cfgFile = loadConfigFile()
    if (fs.existsSync(cfgFile)) return JSON.parse(fs.readFileSync(cfgFile, 'utf-8'))
  } catch (e) { console.error('加载配置失败:', e) }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(config) {
  try {
    const cfgFile = loadConfigFile()
    const configDir = path.dirname(cfgFile)
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (e) { console.error('保存配置失败:', e); return false }
}

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: 60000, maxBuffer: 1024 * 1024 * 10, ...options }, (error, stdout, stderr) => {
      if (error) { reject(new Error(`命令执行失败：${command}\n${error.message}`)); return }
      resolve({ stdout, stderr })
    })
    child.stdout?.on('data', (data) => mainWindow?.webContents.send('command-output', { type: 'log', data: data.toString() }))
    child.stderr?.on('data', (data) => mainWindow?.webContents.send('command-output', { type: 'log', data: data.toString() }))
  })
}

function checkPathExist(p) { try { return fs.existsSync(p) } catch { return false } }
function getProjectName(url) { const m = url.match(/\/([^\/]+?)(?:\.git)?$/); return m ? m[1] : null }
async function checkGitRepo(p) { try { await execPromise(`git -C "${p}" rev-parse --git-dir`); return true } catch { return false } }
function checkPackageJson(p) { return fs.existsSync(path.join(p, 'package.json')) }

// IPC
ipcMain.handle('get-config', () => loadConfig())
ipcMain.handle('save-config', (e, config) => saveConfig(config))
ipcMain.handle('select-file', async (e, options = {}) => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: options.filters || [{ name: '所有文件', extensions: ['*'] }], defaultPath: options.defaultPath || app.getPath('home') })
  return r.canceled ? null : r.filePaths[0]
})
ipcMain.handle('select-folder', async (e, options = {}) => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], defaultPath: options.defaultPath || app.getPath('home') })
  return r.canceled ? null : r.filePaths[0]
})
ipcMain.handle('open-with-ide', async (e, { folderPath, idePath }) => {
  try {
    if (!checkPathExist(idePath)) return { success: false, error: `IDE 路径不存在: ${idePath}` }
    if (!checkPathExist(folderPath)) return { success: false, error: `文件夹路径不存在: ${folderPath}` }
    spawn(idePath, [folderPath], { detached: true, stdio: 'ignore' }).unref()
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('open-in-explorer', async (e, folderPath) => { try { shell.openPath(folderPath); return { success: true } } catch (e) { return { success: false, error: e.message } } })
ipcMain.handle('git-clone', async (e, { gitUrl, targetDir, branch }) => {
  const projectName = getProjectName(gitUrl)
  const targetPath = path.join(targetDir, projectName)
  try {
    if (!checkPathExist(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
    
    if (checkPathExist(targetPath)) return { success: false, error: `目标路径已存在: ${targetPath}` }
  
    const { terminal, termId } = getMainTerminal()
    
    return new Promise((resolve) => {
      const marker = `__GIT_CLONE_DONE_${Date.now()}__`
      let output = ''
      
      const onData = (data) => {
        output += data
        if (output.includes(marker)) {
          terminal.removeListener('data', onData)
          resolve({ success: true, targetPath, termId })
        }
      }
      
      terminal.onData(onData)
      
      if (process.platform === 'win32') {
        terminal.write(`cd /d "${targetDir}"\r`)
        terminal.write(`git clone "${gitUrl}" "${projectName}"\r`)
        terminal.write(`echo ${marker}\r`)
      } else {
        terminal.write(`cd "${targetDir}" && git clone "${gitUrl}" "${projectName}" && echo ${marker}\r`)
      }
    })
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('git-switch-branch', async (e, { targetPath, branch }) => {
  try {
    if (!await checkGitRepo(targetPath)) return { success: false, error: '不是 Git 仓库' }
    
    const { terminal, termId } = getMainTerminal()
    
    return new Promise((resolve) => {
      const marker = `__GIT_SWITCH_DONE_${Date.now()}__`
      let output = ''
      
      const onData = (data) => {
        output += data
        if (output.includes(marker)) {
          terminal.removeListener('data', onData)
          resolve({ success: true, termId })
        }
      }
      
      terminal.onData(onData)
      
      if (process.platform === 'win32') {
        terminal.write(`cd /d "${targetPath}"\r`)
        terminal.write(`git fetch origin && git switch ${branch}\r`)
        terminal.write(`echo ${marker}\r`)
      } else {
        terminal.write(`cd "${targetPath}" && git fetch origin && git switch ${branch} && echo ${marker}\r`)
      }
    })
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('npm-install', async (e, { targetPath }) => {
  try {
    if (!checkPackageJson(targetPath)) return { success: false, error: 'package.json 不存在' }
    
    const { terminal, termId } = getMainTerminal()
    
    return new Promise((resolve) => {
      const marker = `__NPM_INSTALL_DONE_${Date.now()}__`
      let output = ''
      
      const onData = (data) => {
        output += data
        if (output.includes(marker)) {
          terminal.removeListener('data', onData)
          resolve({ success: true, termId })
        }
      }
      
      terminal.onData(onData)
      
      if (process.platform === 'win32') {
        terminal.write(`cd /d "${targetPath}"\r`)
        terminal.write(`npm i\r`)
        terminal.write(`echo ${marker}\r`)
      } else {
        terminal.write(`cd "${targetPath}" && npm i && echo ${marker}\r`)
      }
    })
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('npm-run-dev', async (e, { targetPath }) => {
  try {
    if (!checkPackageJson(targetPath)) return { success: false, error: 'package.json 不存在' }
    
    const termId = terminalIdCounter++
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash'
    
    const ptyProcess = pty.spawn(shell, [], {
      cwd: targetPath,
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      env: process.env
    })
    
    // 自动执行 npm run dev
    ptyProcess.write(`cd /d "${targetPath}" && npm run dev\r`)
    
    terminals.set(termId, ptyProcess)
    
    // 转发 PTY 输出到渲染进程
    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', { termId, data })
      }
    })
    
    ptyProcess.onExit(({ exitCode }) => {
      terminals.delete(termId)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-exit', { termId, exitCode })
      }
    })
    
    return { success: true, termId }
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('clear-node-modules', async (e, { targetPath }) => {
  try {
    if (!checkPathExist(targetPath)) return { success: false, error: '路径不存在' }
    
    const { terminal, termId } = getMainTerminal()
    
    // 返回 Promise，等待命令执行完成
    return new Promise((resolve) => {
      const marker = `__CLEAR_DONE_${Date.now()}__`
      let output = ''
      
      const onData = (data) => {
        output += data
        // 检测命令完成标记
        if (output.includes(marker)) {
          terminal.removeListener('data', onData)
          resolve({ success: true, termId })
        }
      }
      
      terminal.onData(onData)
      
      // 执行清理命令
      if (process.platform === 'win32') {
        terminal.write(`cd /d "${targetPath}"\r`)
        terminal.write(`rmdir /s /q node_modules\r`)
        terminal.write(`del package-lock.json /q\r`)
        terminal.write(`npm cache clean --force\r`)
        // 输出标记，表示命令完成
        terminal.write(`echo ${marker}\r`)
      } else {
        terminal.write(`cd "${targetPath}" && rm -rf node_modules && rm -f package-lock.json && npm cache clean --force && echo ${marker}\r`)
      }
    })
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('git-pull', async (e, { targetPath }) => {
  try { 
    if (!await checkGitRepo(targetPath)) return { success: false, error: '不是 Git 仓库' }
    
    const { terminal, termId } = getMainTerminal()
    
    return new Promise((resolve) => {
      const marker = `__GIT_PULL_DONE_${Date.now()}__`
      let output = ''
      
      const onData = (data) => {
        output += data
        if (output.includes(marker)) {
          terminal.removeListener('data', onData)
          resolve({ success: true, termId })
        }
      }
      
      terminal.onData(onData)
      
      if (process.platform === 'win32') {
        terminal.write(`cd /d "${targetPath}"\r`)
        terminal.write(`git pull\r`)
        terminal.write(`echo ${marker}\r`)
      } else {
        terminal.write(`cd "${targetPath}" && git pull && echo ${marker}\r`)
      }
    })
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('delete-folder', async (e, targetPath) => {
  try { 
    if (!checkPathExist(targetPath)) return { success: false, error: '路径不存在' }
    
    const { terminal, termId } = getMainTerminal()
    
    return new Promise((resolve) => {
      const marker = `__DELETE_DONE_${Date.now()}__`
      let output = ''
      
      const onData = (data) => {
        output += data
        if (output.includes(marker)) {
          terminal.removeListener('data', onData)
          resolve({ success: true, termId })
        }
      }
      
      terminal.onData(onData)
      
      const parentDir = path.dirname(targetPath)
      const folderName = path.basename(targetPath)
      
      if (process.platform === 'win32') {
        terminal.write(`cd /d "${parentDir}"\r`)
        terminal.write(`rmdir /s /q "${folderName}"\r`)
        terminal.write(`echo ${marker}\r`)
      } else {
        terminal.write(`cd "${parentDir}" && rm -rf "${folderName}" && echo ${marker}\r`)
      }
    })
  } catch (e) { return { success: false, error: e.message } }
})
ipcMain.handle('open-external', async (e, url) => { try { await shell.openExternal(url); return { success: true } } catch (e) { return { success: false, error: e.message } } })

// 终端 PTY IPC
ipcMain.handle('terminal-write', (e, { termId, data }) => {
  const ptyProcess = terminals.get(termId)
  if (ptyProcess) {
    ptyProcess.write(data)
    return { success: true }
  }
  return { success: false, error: '终端不存在' }
})

ipcMain.handle('terminal-resize', (e, { termId, cols, rows }) => {
  const ptyProcess = terminals.get(termId)
  if (ptyProcess) {
    ptyProcess.resize(cols, rows)
    return { success: true }
  }
  return { success: false, error: '终端不存在' }
})

ipcMain.handle('terminal-close', (e, { termId }) => {
  const ptyProcess = terminals.get(termId)
  if (ptyProcess) {
    ptyProcess.kill()
    terminals.delete(termId)
    return { success: true }
  }
  return { success: false, error: '终端不存在' }
})

// 全局错误处理
process.on('uncaughtException', (err) => console.error('[Uncaught]', err))
process.on('unhandledRejection', (err) => console.error('[Unhandled]', err))

// 配置 Cookie 策略，允许第三方 Cookie（解决 iframe 中某些网站的登录问题）
app.whenReady().then(() => {
  const { session } = require('electron')
  // 设置更宽松的 Cookie 策略
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Set-Cookie': details.responseHeaders['set-cookie']?.map(cookie => {
          // 允许第三方 Cookie：移除 SameSite 限制
          return cookie
            .replace('SameSite=Strict', 'SameSite=None')
            .replace('SameSite=Lax', 'SameSite=None')
        }) || []
      }
    })
  })

  // 允许所有 iframe 内容（调试用，生产环境谨慎使用）
  // 或者针对特定域名设置
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'iframe') {
      callback(true) // 允许 iframe
    } else {
      callback(false)
    }
  })

  console.log('[App] Ready，创建窗口...')
  console.log('[App] 运行模式:', isDev ? '开发' : '打包')
  loadConfigFile() // 初始化配置文件路径
  createWindow()
}).catch((err) => {
  console.error('[App] Ready 失败:', err)
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
