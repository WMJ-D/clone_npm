const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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
module.exports = {
    batchCloneAndSwitchBranch
}