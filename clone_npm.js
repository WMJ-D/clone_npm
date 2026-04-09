#!/usr/bin/env node

// const { batchHandleProjects } = require('./clear_yl_npm_i.js');
// const { batchCloneAndSwitchBranch } = require('./clone_check_branch.js');
const { exec, spawn, execPromise, execSync } = require('child_process');
const { resolve } = require('path');
const fs = require('fs');
const path = require('path');
const os = require('os');
// const { configList, CodingEditPath } = require('./config.js');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const SERVER_FILE = path.join(__dirname, 'server.js');
const SERVER_PID_FILE = path.join(__dirname, 'server.pid');
const EDITOR_URL = 'http://localhost:3000';
let serverProcess = null; // 保存进程引用，用于后续关闭
console.log('温馨提示1：', '若在编辑器终端里执行脚本，可能会有权限问题，建议在终端里执行');
console.log('温馨提示2：', '若将脚本安装至本地，则可以直接通过cn 执行命令，否则需要通过node clone_npm执行');
console.table({
    '执行 cn': '启动配置服务并打开浏览器',
    '执行 cn 1': '下载代码、切换分支、打开项目文件夹',
    '执行 cn 2': '清除依赖、下载依赖',
    '执行 cn 3': '批量打开项目文件夹',
    '执行 cn 4': '批量拉取最新代码， npm run dev',
    '执行 cn 5': '下载代码、切换分支、打开项目文件夹、清除依赖、下载依赖',
});
// 2. 提取自定义参数（排除前两个默认参数）
const customArgs = process.argv.slice(2);
console.log('自定义参数列表：', customArgs);
let GITLAB_PROJECT_LIST = [] //配置
let CodingEditPath = '' //软件地址



// 根据端口号查找并杀死占用该端口的进程
async function killProcessByPort(port) {
    const platform = os.platform();
    let command;
    if (platform === 'win32') {
        // Windows: netstat -ano 查找监听端口的PID
        command = `netstat -ano | findstr :${port} | findstr LISTENING`;
    } else if (platform === 'darwin') {
        // macOS
        command = `lsof -i :${port} -t -sTCP:LISTEN`;
    } else {
        // Linux
        command = `lsof -i :${port} -t -sTCP:LISTEN 2>/dev/null || ss -tlnp "sport = :${port}" | grep -oP 'pid=\\K[0-9]+'`;
    }

    return new Promise((resolve) => {
        exec(command, (err, stdout) => {
            if (err || !stdout.trim()) {
                console.log(`ℹ️  端口 ${port} 未被占用，无需清理`);
                resolve(false);
                return;
            }

            let pids = [];
            if (platform === 'win32') {
                // Windows netstat 输出格式：TCP  0.0.0.0:3000  0.0.0.0:0  LISTENING  12345
                const lines = stdout.trim().split('\n');
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parseInt(parts[parts.length - 1]);
                    if (!isNaN(pid) && pid > 0) {
                        pids.push(pid);
                    }
                }
            } else {
                // macOS/Linux lsof 直接输出PID（每行一个）
                pids = stdout.trim().split('\n')
                    .map(p => parseInt(p.trim()))
                    .filter(p => !isNaN(p) && p > 0);
            }

            // 去重
            pids = [...new Set(pids)];
            if (pids.length === 0) {
                console.log(`ℹ️  端口 ${port} 未找到占用进程`);
                resolve(false);
                return;
            }

            for (const pid of pids) {
                try {
                    if (platform === 'win32') {
                        // Windows 用 taskkill 强制终止
                        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                    } else {
                        process.kill(pid, 'SIGKILL');
                    }
                    console.log(`✅ 已杀死占用端口 ${port} 的进程 PID：${pid}`);
                } catch (killErr) {
                    console.warn(`⚠️  杀死进程 ${pid} 失败：${killErr.message}，请手动处理`);
                }
            }
            resolve(true);
        });
    });
}

// 1. 自动启动配置服务并打开浏览器
async function startConfigServer() {
    try {
        // ========== 修复1：安全杀死旧进程（基于PID文件） ==========
        if (fs.existsSync(SERVER_PID_FILE)) {
            const pidStr = fs.readFileSync(SERVER_PID_FILE, 'utf8').trim();
            const pid = parseInt(pidStr);
            console.log("🚀 ~ startConfigServer ~ 检测到旧PID：", pidStr);

            // 校验PID是否为有效数字
            if (!isNaN(pid) && pid > 0) {
                try {
                    // 尝试杀死进程（SIGINT等同于Ctrl+C，更友好）
                    process.kill(pid, 'SIGINT');
                    console.log(`✅ 已向旧进程 ${pid} 发送终止信号`);
                    // 杀死后删除PID文件，避免残留
                    fs.unlinkSync(SERVER_PID_FILE);
                } catch (killErr) {
                    // 捕获"进程不存在"错误，仅打印提示，不中断流程
                    if (killErr.code === 'ESRCH') {
                        console.log(`ℹ️  旧进程 ${pid} 已不存在，跳过杀死操作`);
                    } else if (killErr.code === 'EPERM') {
                        console.warn(`⚠️  无权限杀死进程 ${pid}，请手动关闭或提升权限`);
                    } else {
                        console.warn(`⚠️  杀死旧进程失败：${killErr.message}`);
                    }
                    // 无论是否杀死成功，都删除无效的PID文件
                    fs.unlinkSync(SERVER_PID_FILE);
                }
            } else {
                // PID不是有效数字，直接删除PID文件
                fs.unlinkSync(SERVER_PID_FILE);
                console.log(`ℹ️  PID文件内容无效，已删除`);
            }
        }

        // ========== 修复2：基于端口号兜底杀进程（解决重装后PID文件丢失的问题） ==========
        await killProcessByPort(3000);

        // ========== 启动新服务 ==========
        console.log(`🚀 正在启动配置服务...`);
        serverProcess = spawn('node', [SERVER_FILE], {
            detached: true,
            stdio: 'ignore', // 彻底后台化
            windowsHide: true // Windows隐藏窗口
        });

        // 监听进程启动失败事件
        serverProcess.on('error', (spawnErr) => {
            console.error(`❌ 服务启动失败：${spawnErr.message}`);
            // 清理PID文件（如果已写入）
            if (fs.existsSync(SERVER_PID_FILE)) {
                fs.unlinkSync(SERVER_PID_FILE);
            }
        });

        // 确认进程启动后写入PID文件
        serverProcess.on('spawn', () => {
            console.log(`✅ 服务已启动，PID：${serverProcess.pid}`);
            fs.writeFileSync(SERVER_PID_FILE, serverProcess.pid.toString());
            serverProcess.unref(); // 解除主进程引用，后台运行
        });

        // 延迟1秒（等服务启动），打开浏览器
        setTimeout(() => {
            // 修复：使用跨平台的浏览器打开方式
            let cmd;
            const platform = os.platform();
            if (platform === 'win32') {
                // Windows：正确的start命令格式（必须加引号，且start后加空串处理URL）
                cmd = `start "" "${EDITOR_URL}"`;
            } else if (platform === 'darwin') {
                // macOS：直接用open命令
                cmd = `open "${EDITOR_URL}"`;
            } else {
                // Linux：优先用xdg-open，备选x-www-browser
                cmd = `which xdg-open >/dev/null 2>&1 && xdg-open "${EDITOR_URL}" || x-www-browser "${EDITOR_URL}"`;
            }

            // 执行命令并处理错误
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    console.warn('\x1B[33m无法自动打开浏览器，请手动访问：\x1B[0m', EDITOR_URL);
                    console.debug('浏览器启动错误：', err.message, stderr); // 调试用
                } else {
                    console.log('\x1B[32m浏览器已打开，正在访问配置编辑器...\x1B[0m');
                }
            });
        }, 1000);

        console.log('\x1B[36m配置编辑器已启动：\x1B[0m', EDITOR_URL);
        console.log('\x1B[33m请在浏览器中配置后保存，再重新执行 cn 命令\x1B[0m');
        // process.exit(0); // 启动编辑器后退出，让用户配置完成后重新执行
    } catch (err) {
        console.error('\x1B[31m启动配置服务失败：\x1B[0m', err.message);
        if (fs.existsSync(SERVER_PID_FILE)) {
            try {
                fs.unlinkSync(SERVER_PID_FILE);
            } catch (unlinkErr) {
                console.debug('清理PID文件失败：', unlinkErr.message);
            }
        }
    }
}


// 2. 加载配置文件
function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            console.log('\x1B[33m未找到config.json，自动启动配置编辑器...\x1B[0m');
            startConfigServer(); // 无配置则启动编辑器
            return null; // 终止后续逻辑
        }

        const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configContent);

        // 基础校验
        if (!Array.isArray(config.configList)) {
            throw new Error('config.json 格式错误：configList 必须是数组');
        }

        // 过滤出需要执行的配置项
        const enableItems = config.configList.filter(item => item.enable === true);
        if (enableItems.length === 0) {
            console.log('\x1B[33m无勾选「执行」的仓库配置，\x1B[0m');
            // startConfigServer(); // 无执行项则启动编辑器
            return null;
        }
        GITLAB_PROJECT_LIST = enableItems
        CodingEditPath = config.CodingEditPath;
        console.log(`\x1B[36m已加载配置：\x1B[0m 共 ${config.configList.length} 项，其中 ${enableItems.length} 项勾选执行`);
    } catch (err) {
        console.error('\x1B[31m配置加载失败：\x1B[0m', err.message);
        process.exit(1);
    }
}




//!!!在编辑器里执行脚本可能会有权限问题，建议在终端里执行
//!!!删除依赖，所属项目不能在运行中，否则会删除失败
if (customArgs.length == 0) {
    handleJsProject()
} else {
    handleJsProject(customArgs[0])
}
// handleJsProject(1) //下载代码、切换分支、打开项目文件夹
// handleJsProject(2) //清除依赖、下载依赖
// handleJsProject(3) //批量打开项目文件夹
// handleJsProject(4) //批量拉取最新代码， npm run dev
// handleJsProject(5) //下载代码、切换分支、打开项目文件夹、清除依赖、下载依赖


/**
 * 执行脚本
 * @param {string} flag 执行标志位，1：下载代码、切换分支 ，2：清除依赖、下载依赖 ，3：批量打开项目文件夹 ，不传flag 顺序执行下载代码、切换分支、清除依赖、下载依赖
 */
async function handleJsProject(flag) {
    flag && loadConfig(); // 加载配置（无配置/无执行项会自动启动编辑器）
    if (!flag) {
        //通过trae打开clone_npm.js文件
        // await openFolderWithApp(CodingEditPath, __dirname + '\\config.js');
        await startConfigServer();
    } else if (flag == 1) {
        //下载代码、切换分支
        await batchCloneAndSwitchBranch(GITLAB_PROJECT_LIST);
        //打开项目文件夹
        await openProjectFolders();
    } else if (flag == 2) {
        //清除依赖、下载依赖
        await batchHandleProjects(GITLAB_PROJECT_LIST);
    } else if (flag == 3) {
        //打开项目文件夹
        await openProjectFolders();
    } else if (flag == 4) {
        //批量拉取最新代码
        await gitPullLatestCode();
    } else if (flag == 5) {
        //下载代码、切换分支
        await batchCloneAndSwitchBranch(GITLAB_PROJECT_LIST);
        //打开项目文件夹
        await openProjectFolders();
        //清除依赖、下载依赖
        await batchHandleProjects(GITLAB_PROJECT_LIST);
    }
}

/**
 * 用指定软件打开指定文件夹/文件
 * @param {string} appPath - 软件可执行文件路径（绝对路径）
 * @param {string} folderPath - 要打开的文件路径（相对/绝对路径）
 * @returns {Promise<void>}
 */
function openFolderWithApp(appPath, folderPath) {
    //写法1
    const absoluteFolderPath = resolve(folderPath);
    const absoluteAppPath = resolve(appPath);

    return new Promise((resolve, reject) => {
        console.log(`应用路径：${absoluteAppPath}`);
        console.log(`文件路径：${absoluteFolderPath}`);

        if (process.platform === 'win32') {
            // Windows: 直接用 spawn 启动程序
            const child = spawn(absoluteAppPath, [absoluteFolderPath], {
                detached: true,
                stdio: 'ignore',
                windowsHide: false // Node 20 支持，显示窗口
            });

            child.on('error', (err) => {
                reject(new Error(`启动失败：${err.message}`));
            });

            child.unref();
            console.log(`成功启动`);
            resolve();

        } else if (process.platform === 'darwin') {
            spawn('open', ['-a', absoluteAppPath, absoluteFolderPath], {
                stdio: 'ignore'
            });
            resolve();

        } else {
            spawn(absoluteAppPath, [absoluteFolderPath], {
                detached: true,
                stdio: 'ignore'
            });
            resolve();
        }
    });
    //写法2
    // const absoluteFolderPath = resolve(folderPath);
    // const absoluteAppPath = resolve(appPath);

    // return new Promise((resolve, reject) => {
    //     console.log(`应用路径：${absoluteAppPath}`);
    //     console.log(`文件夹路径：${absoluteFolderPath}`);

    //     // Windows: 使用 exec + start 命令
    //     // 关键：使用 { encoding: 'utf8', shell: 'cmd.exe' }
    //     const command = `start "" "${absoluteAppPath}" "${absoluteFolderPath}"`;

    //     exec(command, {
    //         encoding: 'utf8',
    //     }, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error('错误:', error.message);
    //             reject(error);
    //             return;
    //         }
    //         console.log('启动成功');
    //         resolve();
    //     });
    // });
}

async function openProjectFolders() {
    for (const project of GITLAB_PROJECT_LIST) {
        await openFolderWithApp(CodingEditPath, project.savePath);
    }
}

//git拉取当前分支的代码，执行npm run dev
// 拉取代码并启动项目的核心函数
async function gitPullLatestCode() {
    for (const project of GITLAB_PROJECT_LIST) {
        const { savePath, codePath, gitUrl } = project;
        const projectName = getProjectNameFromGitUrl(gitUrl);
        // 用path.join拼接路径，自动适配系统分隔符（\或/）
        const projectPath = path.join(savePath, projectName);
        const codePathFull = path.join(savePath, codePath);

        console.log(`===== 开始处理项目：${projectName} =====`);

        // 拉取最新代码
        try {
            // 前置校验：项目路径是否存在
            checkPathExist(projectPath);
            // 前置校验：是否为Git仓库
            checkGitRepository(projectPath);

            console.log(`拉取最新代码：${projectPath}`);
            const pullResult = await execPromise1(`cd "${projectPath}" && git pull`);
            console.log(`拉取最新代码成功：${projectPath}\n${pullResult.stdout}`);
        } catch (error) {
            console.error(`拉取最新代码失败：${projectPath}\n${error.message}`);
            // 拉取失败仍继续处理npm（也可以根据需要return跳过）
        }

        // 执行npm相关命令
        try {
            // 前置校验：webapp路径是否存在
            checkPathExist(codePathFull);
            // 前置校验：是否有package.json
            checkPackageJson(codePathFull);

            // console.log(`安装/更新依赖：${codePathFull}`);
            // // 先安装依赖（--force解决可能的依赖冲突）
            // await execPromise1(`cd "${codePathFull}" && npm install --force`);

            console.log(`执行npm run dev：${codePathFull}`);
            // 关键：加&让dev后台运行（Windows用start，Mac/Linux用&）
            // Windows：start cmd /k 保持窗口打开，方便查看日志
            const devCommand = process.platform === 'win32' ?
                `cd "${codePathFull}" && start cmd /k npm run dev` :
                `cd "${codePathFull}" && npm run dev &`;
            await execPromise1(devCommand);
            console.log(`执行npm run dev成功：${codePathFull}（已后台启动）`);
        } catch (error) {
            console.error(`执行npm run dev失败：${codePathFull}\n${error.message}`);
        }

        console.log(`===== 结束处理项目：${projectName} =====\n`);
    }
}

// 封装带Promise的exec，增加超时和错误详情
function execPromise1(command, options = {}) {
    return new Promise((resolve, reject) => {
        const child = exec(command, { timeout: 60000, ...options }, (error, stdout, stderr) => {
            if (error) {
                // 整合错误信息：包含命令、错误、stdout、stderr
                error.message = `命令执行失败：${command}\n错误详情：${error.message}\nstdout：${stdout}\nstderr：${stderr}`;
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}
// 校验路径是否存在
function checkPathExist(checkPath) {
    if (!fs.existsSync(checkPath)) {
        throw new Error(`路径不存在：${checkPath}`);
    }
}

// 校验是否为Git仓库
function checkGitRepository(repoPath) {
    const gitDir = path.join(repoPath, '.git');
    if (!fs.existsSync(gitDir)) {
        throw new Error(`不是Git仓库：${repoPath}（未找到.git目录）`);
    }
}

// 校验是否有package.json
function checkPackageJson(projectPath) {
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        throw new Error(`未找到package.json：${pkgPath}`);
    }
}



// ==================== 脚本说明 =====================
// 本脚本用于批量克隆GitLab上的多个项目，并切换到指定分支。
// 支持为每个项目单独指定存放路径，或使用默认路径（脚本所在目录）。
// 使用前请确保已安装Git，并根据实际需求修改配置项。
// =====================================================

/**
 * 批量克隆GitLab项目并切换指定分支（支持指定存放路径）
 * @param {Array} projectConfigList 项目配置数组
 * 格式：[{ gitUrl: 'GitLab项目地址', branch: '目标分支名', savePath?: '自定义存放路径' }, ...]
 */
async function batchCloneAndSwitchBranch(projectConfigList) {
    if (!Array.isArray(projectConfigList) || projectConfigList.length === 0) {
        console.error('❌ 错误：请传入有效的项目配置数组（包含gitUrl和branch）');
        return;
    }

    console.log(`🚀 开始批量处理 ${projectConfigList.length} 个GitLab项目...\n`);

    // 遍历每个项目，按顺序执行克隆和切换分支
    for (let index = 0; index < projectConfigList.length; index++) {
        const { gitUrl, branch, savePath } = projectConfigList[index];
        const projectIndex = index + 1;

        // 校验核心配置项是否完整
        if (!gitUrl || !branch) {
            console.error(`❌ 第 ${projectIndex} 个项目配置不完整，缺少gitUrl或branch，跳过该项目`);
            console.log(`----------------------------------------------------\n`);
            continue;
        }

        try {
            console.log(`====================================================`);
            console.log(`正在处理第 ${projectIndex} 个项目`);
            console.log(`Git地址：${gitUrl}`);
            console.log(`目标分支：${branch}`);
            console.log(`指定存放路径：${savePath || '默认（脚本所在目录）'}`);
            console.log(`====================================================`);

            // 1. 提取项目名称（从git地址中解析，支持.git后缀和无后缀）
            const projectName = getProjectNameFromGitUrl(gitUrl);
            console.log(`\n🔍 解析出项目名称：${projectName}`);

            // 2. 确定最终的项目存放目录（优先使用单个项目自定义路径，无则使用默认路径）
            let finalProjectDir;
            if (savePath) {
                // 格式化自定义存放路径（兼容Windows/Mac/Linux路径分隔符）
                const normalizedSavePath = path.normalize(savePath);
                // 确保自定义存放目录存在，不存在则自动创建
                if (!fs.existsSync(normalizedSavePath)) {
                    fs.mkdirSync(normalizedSavePath, { recursive: true }); // recursive: true 支持创建多级目录
                    console.log(`ℹ️  自定义存放目录不存在，已自动创建：${normalizedSavePath}`);
                }
                // 拼接「自定义存放路径 + 项目名称」作为最终项目目录
                finalProjectDir = path.join(normalizedSavePath, projectName);
            } else {
                // 默认路径：脚本所在目录 + 项目名称
                finalProjectDir = path.resolve(process.cwd(), projectName);
            }
            console.log(`\n📂 项目最终存放目录：${finalProjectDir}`);

            // 3. 检查项目是否已存在，避免重复克隆
            if (fs.existsSync(finalProjectDir)) {
                console.log(`ℹ️  项目目录 ${projectName} 已存在，跳过克隆，直接切换分支`);
                // 切换到项目目录，执行分支切换
                switchBranch(finalProjectDir, branch);
            } else {
                // 4. 克隆GitLab项目到指定目录
                console.log(`\n📥 开始克隆项目到指定目录...`);
                // git clone 语法：git clone <git地址> <目标存放路径/项目名>
                execSync(`git clone ${gitUrl} "${finalProjectDir}"`, {
                    stdio: 'inherit', // 实时输出克隆日志到控制台
                    encoding: 'utf-8'
                });
                console.log(`✅ 项目 ${projectName} 克隆成功`);

                // 5. 切换到指定分支
                switchBranch(finalProjectDir, branch);
            }

            console.log(`\n✅ 第 ${projectIndex} 个项目处理完成！`);
            console.log(`----------------------------------------------------\n`);

        } catch (error) {
            console.error(`\n❌ 第 ${projectIndex} 个项目处理失败：${error.message}`);
            console.log(`----------------------------------------------------\n`);
            continue;
        }
    }

    console.log(`🎉 所有项目批量处理完毕！`);
}

/**
 * 从Git地址中提取项目名称
 * @param {string} gitUrl GitLab项目地址（支持http/https/ssh格式）
 * @returns {string} 项目名称
 */
function getProjectNameFromGitUrl(gitUrl) {
    // 处理规则：截取最后一个斜杠后的内容，去除.git后缀（如果有）
    const lastSlashIndex = gitUrl.lastIndexOf('/');
    let projectName = gitUrl.slice(lastSlashIndex + 1);
    // 去除.git后缀
    if (projectName.endsWith('.git')) {
        projectName = projectName.slice(0, -4);
    }
    return projectName;
}

/**
 * 切换项目到指定分支
 * @param {string} projectDir 项目目录路径
 * @param {string} targetBranch 目标分支名
 */
function switchBranch(projectDir, targetBranch) {
    console.log(`\n🔀 开始切换到 ${targetBranch} 分支...`);

    // 1. 进入项目目录
    process.chdir(projectDir);

    // 2. 拉取远程所有分支信息（确保本地有目标分支的缓存）
    console.log(`ℹ️  拉取远程分支最新信息...`);
    execSync(`git fetch origin`, {
        stdio: 'inherit',
        encoding: 'utf-8'
    });

    // 3. 尝试切换分支（优先使用git switch，兼容git checkout）
    try {
        // 先检查本地是否存在目标分支
        const localBranches = execSync(`git branch`, { encoding: 'utf-8' });
        if (localBranches.includes(targetBranch)) {
            // 本地已存在分支，直接切换
            execSync(`git switch ${targetBranch}`, { stdio: 'inherit' });
        } else {
            // 本地不存在，拉取远程分支并切换（一步到位）
            execSync(`git switch -c ${targetBranch} origin/${targetBranch}`, { stdio: 'inherit' });
        }
        console.log(`✅ 成功切换到 ${targetBranch} 分支`);
    } catch (switchError) {
        // 兼容旧版本Git（无git switch命令），使用git checkout
        console.log(`ℹ️  git switch命令不支持，使用git checkout兼容...`);
        try {
            const localBranches = execSync(`git branch`, { encoding: 'utf-8' });
            if (localBranches.includes(targetBranch)) {
                execSync(`git checkout ${targetBranch}`, { stdio: 'inherit' });
            } else {
                execSync(`git checkout -b ${targetBranch} origin/${targetBranch}`, { stdio: 'inherit' });
            }
            console.log(`✅ 成功切换到 ${targetBranch} 分支`);
        } catch (checkoutError) {
            throw new Error(`切换分支失败：${checkoutError.message}`);
        }
    }
}


// ===================== 脚本说明 =====================
// 本脚本用于批量清理多个Node.js项目的依赖文件（node_modules和package-lock.json），
// 并重新安装依赖。适用于需要统一更新依赖或解决依赖冲突的场景。
// 使用前请确保已安装Node.js和npm，并根据实际项目路径修改配置项。
// =====================================================


/**
 * 休眠函数（可选，用于日志输出更清晰，可删除）
 * @param {number} ms 休眠毫秒数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 删除文件/目录
 * @param {string} targetPath 要删除的文件/目录路径
 */
function deleteTarget(targetPath) {
    try {
        if (fs.existsSync(targetPath)) {
            // 判断是目录还是文件
            const stats = fs.statSync(targetPath);
            if (stats.isDirectory()) {
                // 删除目录（递归删除所有内容）
                fs.rmSync(targetPath, { recursive: true, force: true });
                console.log(`✅ 成功删除目录：${targetPath}`);
            } else {
                // 删除文件
                fs.unlinkSync(targetPath);
                console.log(`✅ 成功删除文件：${targetPath}`);
            }
        } else {
            console.log(`ℹ️  目标不存在，无需删除：${targetPath}`);
        }
    } catch (error) {
        console.error(`❌ 删除失败：${targetPath}，错误信息：${error.message}`);
        // 若删除失败，抛出错误终止当前项目处理，避免影响后续项目
        throw error;
    }
}

/**
 * 处理单个项目的完整流程
 * @param {string} projectPath 项目路径
 */
async function handleSingleProject(projectPath) {
    try {
        // 1. 格式化项目路径（解决不同系统路径分隔符问题）
        const normalizedProjectPath = path.normalize(projectPath);
        console.log(`\n=================================================`);
        console.log(`开始处理项目：${normalizedProjectPath}`);
        console.log(`=================================================`);

        // 2. 定义要删除的目标文件/目录路径
        const nodeModulesPath = path.join(normalizedProjectPath, 'node_modules');
        const packageLockPath = path.join(normalizedProjectPath, 'package-lock.json');

        // 3. 顺序删除 node_modules 和 package-lock.json
        console.log(`\n--- 开始删除依赖文件/目录 ---`);
        deleteTarget(nodeModulesPath); // 先删node_modules
        deleteTarget(packageLockPath); // 再删package-lock.json

        // 4. 清除npm依赖缓存（--force 强制清除）
        console.log(`\n--- 开始清除npm依赖缓存 ---`);
        execSync('npm cache clean --force', {
            cwd: normalizedProjectPath, // 执行目录：当前项目根目录
            stdio: 'inherit' // 输出日志到控制台
        });
        console.log(`✅ npm依赖缓存清除成功`);

        // 5. 执行npm install安装依赖
        console.log(`\n--- 开始执行npm install ---`);
        execSync('npm i', {
            cwd: normalizedProjectPath,
            stdio: 'inherit'
        });
        console.log(`✅ 项目 ${normalizedProjectPath} 依赖安装完成`);

        // 可选：休眠1秒，让日志输出更清晰（可根据需要调整或删除）
        await sleep(1000);

    } catch (error) {
        console.error(`\n❌ 项目 ${projectPath} 处理失败，跳过该项目继续处理下一个`, error.message);
    }
}

/**
 * 批量处理所有项目（按顺序执行）
 */
async function batchHandleProjects(PROJECT) {
    console.log(`🚀 开始（任务2）批量处理 ${PROJECT.length} 个项目...`);
    console.log(`🚀 请确保项目未启动，否则依赖删除失败！！！`);
    for (const project of PROJECT) {
        const projectPath = path.join(project.savePath, project.codePath);
        await handleSingleProject(projectPath); // 按顺序处理，上一个项目完成后再处理下一个
    }
    console.log(`\n🎉 所有项目处理完毕！`);
}