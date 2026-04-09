#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'config.json');
const PORT = 3000;

// 创建服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    console.log("🚀 ~ pathname:", pathname)

    // 设置跨域和响应头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 1. 读取配置（GET /api/config）
    if (req.method === 'GET' && pathname === '/api/config') {
        try {
            if (!fs.existsSync(CONFIG_PATH)) {
                fs.writeFileSync(CONFIG_PATH, JSON.stringify({
                    CodingEditPath: '',
                    configList: [{ enable: false, pName: '', projectName: '', gitUrl: '', branch: 'master', savePath: '', codePath: '', testEnvUrl: '', prodEnvUrl: '' }]
                }, null, 2), 'utf8');
            }
            const config = fs.readFileSync(CONFIG_PATH, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(config);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '读取配置失败：' + err.message }));
        }
        return;
    }

    // 2. 保存配置（POST /api/save）
    if (req.method === 'POST' && pathname === '/api/save') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const config = JSON.parse(body);
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: '配置保存成功！' }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '保存配置失败：' + err.message }));
            }
        });
        return;
    }

    // 3. 选择本地文件/文件夹（POST /api/select-path）
    if (req.method === 'POST' && pathname === '/api/select-path') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { type } = JSON.parse(body); // type: 'file' | 'folder'
                let psScript;
                if (type === 'folder') {
                    psScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
                        $dialog.Description = '请选择文件夹'
                        $dialog.ShowNewFolderButton = $true
                        if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath } else { '' }
                    `;
                } else {
                    psScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        $dialog = New-Object System.Windows.Forms.OpenFileDialog
                        $dialog.Title = '请选择文件'
                        $dialog.Filter = '可执行文件 (*.exe)|*.exe|所有文件 (*.*)|*.*'
                        if ($dialog.ShowDialog() -eq 'OK') { $dialog.FileName } else { '' }
                    `;
                }

                const child = spawn('powershell', ['-NoProfile', '-Command', psScript], { windowsHide: true });
                let result = '';
                child.stdout.on('data', (data) => { result += data.toString(); });
                child.stderr.on('data', (data) => { console.error('select-path stderr:', data.toString()); });
                child.on('close', (code) => {
                    const selectedPath = result.trim();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, path: selectedPath }));
                });
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // 4. 执行命令（POST /api/execute）
    if (req.method === 'POST' && pathname === '/api/execute') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async() => {
            try {
                const { flag } = JSON.parse(body);
                if (!flag || isNaN(flag)) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('ERROR: 无效的命令标识');
                    return;
                }

                // 设置流式响应头
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Transfer-Encoding': 'chunked'
                });

                // 执行clone_npm.js并传递flag参数
                const child = spawn('node', [path.join(__dirname, 'clone_npm.js'), flag], {
                    windowsHide: true,
                });

                // 实时输出stdout
                child.stdout.on('data', (data) => {
                    res.write(`INFO: ${data.toString()}`);
                });

                // 实时输出stderr
                child.stderr.on('data', (data) => {
                    res.write(`ERROR: ${data.toString()}`);
                });

                // 子进程退出
                child.on('close', (code) => {
                    if (code === 0) {
                        res.end(`SUCCESS: 命令 ${flag} 执行完成`);
                    } else {
                        res.end(`ERROR: 命令 ${flag} 执行失败，退出码：${code}`);
                    }
                });

            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`ERROR: ${err.message}`);
            }
        });
        return;
    }

    // 4. 提供静态文件
    if (req.method === 'GET') {
        // 根路径返回 config-editor.html
        if (pathname === '/') {
            const htmlPath = path.join(__dirname, 'config-editor.html');
            fs.readFile(htmlPath, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('config-editor.html 不存在');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
            return;
        }

        // 处理其他静态文件请求
        const staticFilePath = path.join(__dirname, pathname);

        // 检查文件是否存在
        if (fs.existsSync(staticFilePath)) {
            // 根据文件扩展名设置 Content-Type
            const ext = path.extname(staticFilePath).toLowerCase();
            let contentType = 'application/octet-stream';

            if (ext === '.html') contentType = 'text/html';
            else if (ext === '.css') contentType = 'text/css';
            else if (ext === '.js') contentType = 'text/javascript';
            else if (ext === '.json') contentType = 'application/json';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.svg') contentType = 'image/svg+xml';

            // 读取并返回静态文件
            fs.readFile(staticFilePath, (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('读取文件失败');
                    return;
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
            return;
        }
    }

    // 5. 404 处理
    res.writeHead(404);
    res.end('接口不存在');
});

// 启动服务
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\x1B[33m端口 ${PORT} 已被占用（配置服务已启动）\x1B[0m`);
        return;
    }
    console.error('\x1B[31m服务启动失败：\x1B[0m', err.message);
});
process.on('SIGTERM', () => {
    console.log('收到终止信号，开始清理资源...');
    // 清理完成后主动退出
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

server.listen(PORT, 'localhost', () => {
    console.log(`\x1B[36m配置编辑器服务已启动：http://localhost:${PORT}\x1B[0m`);
});

module.exports = { server, PORT };