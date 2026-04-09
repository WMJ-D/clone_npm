const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    console.log(`🚀 开始批量处理 ${PROJECT.length} 个项目...`);
    for (const project of PROJECT) {
        const projectPath = path.join(project.savePath, project.codePath);
        await handleSingleProject(projectPath); // 按顺序处理，上一个项目完成后再处理下一个
    }
    console.log(`\n🎉 所有项目处理完毕！`);
}
module.exports = {
    batchHandleProjects
}