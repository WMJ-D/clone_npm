// ==================== 全局状态 ====================
let config = {
    configList: [],
    CodingEditPath: '',
    CodingEditPathList: []
};
let itemIdCounter = 0;
let isExecuting = false;
let commandOutputUnsubscribe = null;

// ==================== DOM 元素 ====================
const terminalPanel = document.getElementById('terminalPanel');
const terminalLog = document.getElementById('terminalLog');
const mainContainer = document.getElementById('mainContainer');
const msgEl = document.getElementById('msg');

// ==================== 工具函数 ====================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getProjectName(gitUrl) {
    const m = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return m ? m[1] : null;
}

function showMsg(text, isSuccess = true) {
    msgEl.textContent = text;
    msgEl.className = isSuccess ? 'msg msg-success' : 'msg msg-error';
    msgEl.style.display = 'block';
    setTimeout(() => msgEl.style.display = 'none', 3000);
}

function logToTerminal(text, type = 'info') {
    terminalPanel.style.display = 'block';
    const el = document.createElement('div');
    el.className = `log-${type}`;
    const time = new Date().toLocaleTimeString();
    el.textContent = `[${time}] ${text}`;
    terminalLog.appendChild(el);
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

// ==================== 页面切换 ====================

function switchPage(page) {
    const enabledPanel = document.querySelector('.enabled-items-panel');
    const functionBar = document.querySelector('.function-buttons');
    if (page === 'config') {
        document.querySelector('.terminal-container').style.display = '';
        document.getElementById('pageAiModels').style.display = 'none';
        document.getElementById('pageAiChat').style.display = 'none';
        // 恢复悬浮按钮、已勾选面板、功能按钮栏
        document.querySelectorAll('.floating-btn, .back-to-top').forEach(b => b.style.display = '');
        if (enabledPanel) enabledPanel.style.display = '';
        if (functionBar) functionBar.style.display = '';
    } else if (page === 'ai-models') {
        document.querySelector('.terminal-container').style.display = 'none';
        document.getElementById('pageAiModels').style.display = 'block';
        document.getElementById('pageAiChat').style.display = 'none';
        // 隐藏悬浮按钮、已勾选面板、功能按钮栏
        document.querySelectorAll('.floating-btn, .back-to-top').forEach(b => b.style.display = 'none');
        if (enabledPanel) enabledPanel.style.display = 'none';
        if (functionBar) functionBar.style.display = 'none';
        renderAIModelsPage();
    } else if (page === 'ai-chat') {
        document.querySelector('.terminal-container').style.display = 'none';
        document.getElementById('pageAiModels').style.display = 'none';
        document.getElementById('pageAiChat').style.display = 'block';
        document.querySelectorAll('.floating-btn, .back-to-top').forEach(b => b.style.display = 'none');
        if (enabledPanel) enabledPanel.style.display = 'none';
        if (functionBar) functionBar.style.display = 'none';
        renderAIChatGrid();
    }
}

// ==================== 配置加载/保存 ====================

async function loadConfig() {
    try {
        config = await window.electronAPI.getConfig();
        if (!config.configList) config.configList = [];
        if (!config.CodingEditPathList) config.CodingEditPathList = [];
        if (!config.CodingEditPath) config.CodingEditPath = '';

        // 加载编辑器路径列表
        const editPathListEl = document.getElementById('editPathList');
        editPathListEl.innerHTML = '';
        (config.CodingEditPathList || []).forEach(path => editPathListEl.appendChild(createEditPathItem(path)));
        updateEditPathSelect();
        document.getElementById('codingEditPath').value = config.CodingEditPath || '';

        // 加载配置项列表
        const configListEl = document.getElementById('configList');
        configListEl.innerHTML = '';
        itemIdCounter = 0;
        (config.configList || []).forEach(item => configListEl.appendChild(createConfigItem(item)));

        updateEnabledItemsPanel();
        updatePNameTabs();
        showMsg(`配置加载成功！共 ${config.configList.length} 个项目`);
        logToTerminal('配置加载成功', 'success');
    } catch (e) {
        showMsg('加载失败：' + e.message, false);
    }
}

async function saveConfig() {
    try {
        const configList = [];
        document.querySelectorAll('.config-item').forEach(item => {
            const enable = item.querySelector('.enable-checkbox').checked;
            const pName = item.querySelector('.pName').value.trim();
            const projectName = item.querySelector('.projectName').value.trim();
            const gitUrl = item.querySelector('.gitUrl').value.trim();
            const branch = item.querySelector('.branch').value.trim();
            const savePath = item.querySelector('.savePath').value.trim();
            const codePath = item.querySelector('.codePath').value.trim();
            const testEnvUrl = item.querySelector('.testEnvUrl').value.trim();
            const prodEnvUrl = item.querySelector('.prodEnvUrl').value.trim();

            // 校验必填项
            if (enable) {
                if (!pName) throw new Error('存在勾选「执行」但未填写项目名称的配置项，请补充！');
                if (!gitUrl) throw new Error('存在勾选「执行」但未填写Git地址的配置项，请补充！');
                if (!projectName) throw new Error(`Git地址【${gitUrl}】勾选了执行，但未填写项目名称，请补充！`);
                if (!savePath) throw new Error(`Git地址【${gitUrl}】勾选了执行，但未填写保存路径，请补充！`);
                if (!codePath) throw new Error(`Git地址【${gitUrl}】勾选了执行，但未填写代码子路径，请补充！`);
            }

            configList.push({ enable, pName, projectName, gitUrl, branch, savePath, codePath, testEnvUrl, prodEnvUrl });
        });

        const CodingEditPath = document.getElementById('codingEditPath').value.trim();
        const CodingEditPathList = [];
        document.querySelectorAll('.edit-path-input').forEach(input => {
            const p = input.value.trim();
            if (p) CodingEditPathList.push(p);
        });

        config.configList = configList;
        config.CodingEditPath = CodingEditPath;
        config.CodingEditPathList = CodingEditPathList;

        await window.electronAPI.saveConfig(config);
        showMsg('配置保存成功！');
        logToTerminal('配置已保存', 'info');
    } catch (e) {
        showMsg('保存失败：' + e.message, false);
    }
}

// ==================== 已勾选项目面板 ====================

function updateEnabledItemsPanel() {
    const el = document.getElementById('enabledItemsList');
    const enabledItems = [];
    document.querySelectorAll('.config-item').forEach(item => {
        if (item.querySelector('.enable-checkbox').checked) {
            const itemId = item.id.split('-')[2];
            const pName = item.querySelector('.pName').value.trim() || '未命名项目';
            const projectName = item.querySelector('.projectName').value.trim() || '未命名系统';
            enabledItems.push({ itemId, pName, projectName });
        }
    });

    if (enabledItems.length === 0) {
        el.className = 'empty-tip';
        el.innerHTML = '暂无勾选的执行项';
    } else {
        el.className = '';
        el.innerHTML = enabledItems.map(item =>
            `<div class="item" onclick="scrollToItem(${item.itemId})"><span class="name">${escapeHtml(item.projectName)}</span></div>`
        ).join('');
    }
}

function scrollToItem(itemId) {
    document.querySelectorAll('.config-item').forEach(i => i.classList.remove('highlight'));
    const target = document.getElementById(`config-item-${itemId}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('highlight');
        setTimeout(() => target.classList.remove('highlight'), 1500);
    }
}

// ==================== pName 分组标签栏 ====================

function updatePNameTabs() {
    const el = document.getElementById('pName-tabs-list');
    const pNameMap = new Map();

    document.querySelectorAll('.config-item').forEach(item => {
        const pName = item.querySelector('.pName').value.trim() || '未命名项目';
        const itemId = item.id.split('-')[2];
        if (!pNameMap.has(pName)) pNameMap.set(pName, []);
        pNameMap.get(pName).push(itemId);
    });

    if (pNameMap.size === 0) {
        el.innerHTML = '<div class="empty-tip">暂无项目</div>';
    } else {
        el.innerHTML = Array.from(pNameMap.entries()).map(([pName, ids]) =>
            `<div class="pName-tab" data-pName="${pName}" onclick="filterByPName('${pName}')">
                ${escapeHtml(pName)} <span class="count">(${ids.length})</span>
            </div>`
        ).join('');
    }
}

function filterByPName(targetPName) {
    const configListEl = document.getElementById('configList');
    const allItems = Array.from(document.querySelectorAll('.config-item'));
    const matched = [], unmatched = [];

    allItems.forEach(item => {
        const pName = item.querySelector('.pName').value.trim() || '未命名项目';
        if (pName === targetPName) {
            matched.push(item);
            item.classList.add('highlight');
            setTimeout(() => item.classList.remove('highlight'), 1500);
        } else {
            unmatched.push(item);
        }
    });

    configListEl.innerHTML = '';
    matched.forEach(item => configListEl.appendChild(item));
    unmatched.forEach(item => configListEl.appendChild(item));

    // 先滚到顶部，再定位到第一个匹配项
    configListEl.scrollTo({ top: 0 });
    if (matched.length > 0) matched[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    saveConfig();
}

// ==================== 创建配置项 DOM ====================

function createConfigItem(data = {}) {
    const itemId = itemIdCounter++;
    const item = document.createElement('div');
    item.id = `config-item-${itemId}`;
    item.className = 'config-item';
    item.dataset.index = itemId + 1;
    item.innerHTML = `
        <div class="row">
            <label>项目名称：</label>
            <input type="text" class="pName" value="${data.pName || ''}" placeholder="必填：如 山东省黄金地勘">
        </div>
        <div class="row">
            <label>系统名称：</label>
            <input type="text" class="projectName" value="${data.projectName || ''}" placeholder="必填：如 鹰眼智展大屏">
        </div>
        <div class="row">
            <label>是否执行：</label>
            <input type="checkbox" class="enable-checkbox" ${data.enable ? 'checked' : ''}>
            <span style="color:#666;font-size:12px;">勾选后命令会执行该配置</span>
        </div>
        <div class="row">
            <label>Gitlab地址：</label>
            <input type="text" class="gitUrl" value="${data.gitUrl || ''}" placeholder="必填：http://xxx.git">
            <button class="btn-select gitUrl-open" style="margin-left:5px;">打开</button>
        </div>
        <div class="row">
            <label>分支：</label>
            <input type="text" class="branch" value="${data.branch || 'master'}" placeholder="默认：master">
        </div>
        <div class="row">
            <label>保存路径：</label>
            <input type="text" class="savePath" value="${data.savePath || ''}" placeholder="必填：D:\\Projects\\xxx">
        </div>
        <div class="row">
            <label>代码子路径：</label>
            <input type="text" class="codePath" value="${data.codePath || ''}" placeholder="可选：\\项目名\\webapp">
        </div>
        <div class="row">
            <label>测试环境地址：</label>
            <input type="text" class="testEnvUrl" value="${data.testEnvUrl || ''}" placeholder="可选：http://测试环境">
            <button class="btn-select testEnvUrl-open" style="margin-left:5px;">打开</button>
        </div>
        <div class="row">
            <label>正式环境地址：</label>
            <input type="text" class="prodEnvUrl" value="${data.prodEnvUrl || ''}" placeholder="可选：http://正式环境">
            <button class="btn-select prodEnvUrl-open" style="margin-left:5px;">打开</button>
        </div>
        <div class="row item-action-bar">
            <button class="action-btn action-1" data-flag="1" title="git clone + 切换分支 + IDE打开">Clone</button>
            <button class="action-btn action-2" data-flag="2" title="清除依赖 + npm install">重装</button>
            <button class="action-btn action-3" data-flag="3" title="用 IDE 打开项目">打开</button>
            <button class="action-btn action-4" data-flag="4" title="拉取代码 + npm run dev">启动</button>
            <button class="action-btn action-5" data-flag="5" title="Clone + 重装（全部操作）">全部</button>
        </div>
        <div class="row">
            <button class="btn-danger delete-btn">删除</button>
        </div>
    `;

    // 删除按钮
    item.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('确定删除该配置项吗？')) {
            item.remove();
            updateEnabledItemsPanel();
            updatePNameTabs();
        }
    });

    // 单项操作按钮（5个独立功能）
    item.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const flag = parseInt(btn.dataset.flag);
            if (isExecuting) { showMsg('已有命令正在执行，请等待完成！', false); return; }
            isExecuting = true;
            document.querySelectorAll('.function-btn, .action-btn').forEach(b => b.disabled = true);
            
            const projectData = getProjectData(item);
            try {
                terminalLog.innerHTML = '';
                logToTerminal(`[单项] 开始执行命令 [${flag}] - ${projectData.projectName || projectData.pName}`, 'info');
                await executeCommandForItem(flag, projectData);
                logToTerminal(`[单项] 命令 ${flag} 执行完成`, 'success');
            } catch (e) {
                logToTerminal(`[单项] 执行失败：${e.message}`, 'error');
            } finally {
                isExecuting = false;
                document.querySelectorAll('.function-btn, .action-btn').forEach(b => b.disabled = false);
            }
        });
    });

    // 勾选框变化 → 更新面板和标签栏
    const enableCb = item.querySelector('.enable-checkbox');
    const pNameInput = item.querySelector('.pName');
    const projectNameInput = item.querySelector('.projectName');
    const gitUrlInput = item.querySelector('.gitUrl');

    enableCb.addEventListener('change', () => { updateEnabledItemsPanel(); updatePNameTabs(); });
    projectNameInput.addEventListener('input', updateEnabledItemsPanel);
    gitUrlInput.addEventListener('input', updateEnabledItemsPanel);
    pNameInput.addEventListener('input', () => { updateEnabledItemsPanel(); updatePNameTabs(); });

    // 打开 GitLab 地址
    item.querySelector('.gitUrl-open').addEventListener('click', () => {
        const url = gitUrlInput.value.trim();
        if (url) window.electronAPI.openExternal(url); else showMsg('请输入 Gitlab 地址', false);
    });
    // 打开测试环境
    item.querySelector('.testEnvUrl-open').addEventListener('click', () => {
        const url = item.querySelector('.testEnvUrl').value.trim();
        if (url) window.electronAPI.openExternal(url); else showMsg('请输入测试环境地址', false);
    });
    // 打开正式环境
    item.querySelector('.prodEnvUrl-open').addEventListener('click', () => {
        const url = item.querySelector('.prodEnvUrl').value.trim();
        if (url) window.electronAPI.openExternal(url); else showMsg('请输入正式环境地址', false);
    });

    return item;
}

// ==================== 单项操作辅助函数 ====================

function getProjectData(itemEl) {
    return {
        pName: itemEl.querySelector('.pName').value.trim(),
        projectName: itemEl.querySelector('.projectName').value.trim(),
        gitUrl: itemEl.querySelector('.gitUrl').value.trim(),
        branch: itemEl.querySelector('.branch').value.trim() || 'master',
        savePath: itemEl.querySelector('.savePath').value.trim(),
        codePath: itemEl.querySelector('.codePath').value.trim(),
        enable: itemEl.querySelector('.enable-checkbox').checked,
        testEnvUrl: itemEl.querySelector('.testEnvUrl').value.trim(),
        prodEnvUrl: itemEl.querySelector('.prodEnvUrl').value.trim()
    };
}

async function executeCommandForItem(flag, project) {
    const name = project.projectName || project.pName;
    const repoName = getProjectName(project.gitUrl);

    switch (flag) {
        case 1:
            logToTerminal(`[${name}] git clone...`, 'info');
            let r1 = await window.electronAPI.gitClone(project.gitUrl, project.savePath, project.branch);
            if (r1.success) logToTerminal(`[${name}] clone 成功`, 'success'); else logToTerminal(`[${name}] clone 失败: ${r1.error}`, 'error');
            await sleep(500);
            if (project.branch) {
                logToTerminal(`[${name}] 切换分支 ${project.branch}...`, 'info');
                let sw = await window.electronAPI.gitSwitchBranch(pathJoin(project.savePath, repoName), project.branch);
                if (sw.success) logToTerminal(`[${name}] 切换成功`, 'success'); else logToTerminal(`[${name}] 切换失败`, 'error');
            }
            await sleep(300);
            const ide1 = document.getElementById('codingEditPath').value;
            if (ide1) { logToTerminal(`[${name}] IDE 打开...`, 'info'); await window.electronAPI.openWithIDE(project.savePath, ide1); logToTerminal(`[${name}] 已打开`, 'success'); }
            break;
        case 2:
            const cp2 = project.codePath ? pathJoin(project.savePath, project.codePath) : project.savePath;
            logToTerminal(`[${name}] 清除依赖...`, 'info');
            let cr = await window.electronAPI.clearNodeModules(cp2);
            if (cr.success) logToTerminal(`[${name}] 依赖已清除，npm install...`, 'info'); else logToTerminal(`[${name}] 清除失败: ${cr.error}`, 'error');
            await sleep(300);
            let nr = await window.electronAPI.npmInstall(cp2);
            if (nr.success) logToTerminal(`[${name}] npm install 成功`, 'success'); else logToTerminal(`[${name}] npm i 失败: ${nr.error}`, 'error');
            break;
        case 3:
            const ide3 = document.getElementById('codingEditPath').value;
            if (!ide3) { showMsg('请先选择 IDE！', false); return; }
            logToTerminal(`[${name}] IDE 打开...`, 'info'); await window.electronAPI.openWithIDE(project.savePath, ide3); logToTerminal(`[${name}] 已打开`, 'success');
            break;
        case 4:
            const pp4 = pathJoin(project.savePath, repoName);
            const c4 = project.codePath ? pathJoin(project.savePath, project.codePath) : pp4;
            logToTerminal(`[${name}] git pull...`, 'info');
            let pr = await window.electronAPI.gitPull(pp4);
            if (pr.success) logToTerminal(`[${name}] pull 成功`, 'success'); else logToTerminal(`[${name}] pull 失败: ${pr.error}`, 'error');
            await sleep(300);
            logToTerminal(`[${name}] npm run dev...`, 'info');
            let dr = await window.electronAPI.npmRunDev(c4);
            if (dr.success) logToTerminal(`[${name}] dev 已启动`, 'success'); else logToTerminal(`[${name}] dev 启动失败: ${dr.error}`, 'error');
            break;
        case 5:
            // 按钮1
            logToTerminal(`[${name}] [5-1] clone...`, 'info');
            let c5 = await window.electronAPI.gitClone(project.gitUrl, project.savePath, project.branch);
            if (c5.success) logToTerminal(`[${name}] [5-1] clone 成功`, 'success'); else logToTerminal(`[${name}] [5-1] clone 失败: ${c5.error}`, 'error');
            await sleep(500);
            if (project.branch) {
                logToTerminal(`[${name}] [5-1] 切换分支 ${project.branch}...`, 'info');
                let sw5 = await window.electronAPI.gitSwitchBranch(pathJoin(project.savePath, repoName), project.branch);
                logToTerminal(sw5.success ? `[${name}] [5-1] 切换成功` : `[${name}] [5-1] 切换失败`, sw5.success ? 'success' : 'error');
            }
            await sleep(300);
            const ide5 = document.getElementById('codingEditPath').value;
            if (ide5) { logToTerminal(`[${name}] [5-1] IDE 打开...`, 'info'); await window.electronAPI.openWithIDE(project.savePath, ide5); logToTerminal(`[${name}] [5-1] 已打开`, 'success'); }
            await sleep(500);
            // 按钮2
            const cp5 = project.codePath ? pathJoin(project.savePath, project.codePath) : project.savePath;
            logToTerminal(`[${name}] [5-2] 清除依赖...`, 'info');
            let cl5 = await window.electronAPI.clearNodeModules(cp5);
            if (cl5.success) logToTerminal(`[${name}] [5-2] 依赖已清除`, 'success'); else logToTerminal(`[${name}] [5-2] 清除失败: ${cl5.error}`, 'error');
            await sleep(300);
            logToTerminal(`[${name}] [5-2] npm install...`, 'info');
            let n5 = await window.electronAPI.npmInstall(cp5);
            if (n5.success) logToTerminal(`[${name}] [5-2] npm install 成功`, 'success'); else logToTerminal(`[${name}] [5-2] npm i 失败: ${n5.error}`, 'error');
            logToTerminal(`[${name}] [5] 全部完成`, 'success');
            break;
    }
}

function createEditPathItem(path = '') {
    const item = document.createElement('div');
    item.className = 'edit-path-item';
    item.style.cssText = 'display:flex;align-items:center;margin-bottom:10px;padding:8px;border:1px solid #eee;border-radius:4px;';
    item.innerHTML = `
        <input type="text" class="edit-path-input" value="${path}" placeholder="编辑器路径" style="flex:1;margin-right:10px;padding:5px;">
        <button class="btn-select edit-path-select" style="margin-right:5px;">选择</button>
        <button class="btn-danger edit-path-delete" style="padding:5px 10px;">删除</button>
    `;

    const inputEl = item.querySelector('.edit-path-input');
    inputEl.addEventListener('input', () => updateEditPathSelect());

    item.querySelector('.edit-path-select').addEventListener('click', async () => {
        const folder = await window.electronAPI.selectFile({ filters: [{ name: '可执行文件', extensions: ['exe'] }] });
        if (folder) { inputEl.value = folder; updateEditPathSelect(); showMsg('已选择编辑器路径'); }
    });

    item.querySelector('.edit-path-delete').addEventListener('click', () => {
        if (confirm('确定删除该编辑器路径吗？')) { item.remove(); updateEditPathSelect(); }
    });

    return item;
}

function updateEditPathSelect() {
    const selectEl = document.getElementById('codingEditPath');
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">请选择编辑器路径</option>';
    document.querySelectorAll('.edit-path-input').forEach(input => {
        const p = input.value.trim();
        if (p) { const opt = document.createElement('option'); opt.value = p; opt.textContent = p; selectEl.appendChild(opt); }
    });
    if (currentVal) selectEl.value = currentVal;
}

// ==================== 执行命令 (1-5 按钮) ====================

async function executeCommand(flag) {
    await saveConfig();

    // 只处理启用的项目
    const enabledItems = [];
    document.querySelectorAll('.config-item').forEach((item, idx) => {
        if (item.querySelector('.enable-checkbox').checked) {
            const data = {};
            ['pName','projectName','gitUrl','branch','savePath','codePath'].forEach(k => {
                data[k] = item.querySelector(`.${k}`).value.trim();
            });
            enabledItems.push({ ...data, index: idx });
        }
    });

    if (enabledItems.length === 0) {
        showMsg('请先勾选需要执行的配置项！', false);
        return;
    }

    if (isExecuting) {
        showMsg('已有命令正在执行，请等待完成！', false);
        return;
    }

    isExecuting = true;
    document.querySelectorAll('.function-btn').forEach(btn => btn.disabled = true);

    terminalLog.innerHTML = '';
    logToTerminal(`开始执行命令 [${flag}]，共 ${enabledItems.length} 个已启用项目...`, 'info');

    try {
        for (const project of enabledItems) {
            const name = project.projectName || project.pName;
            const repoName = getProjectName(project.gitUrl);

            switch (flag) {
                case 1: // git clone + 切换分支 + IDE打开
                    logToTerminal(`[${name}] git clone...`, 'info');
                    let cloneResult = await window.electronAPI.gitClone(project.gitUrl, project.savePath, project.branch);
                    if (cloneResult.success) logToTerminal(`[${name}] clone 成功`, 'success');
                    else logToTerminal(`[${name}] clone 失败: ${cloneResult.error}`, 'error');

                    await sleep(500);

                    if (project.branch) {
                        logToTerminal(`[${name}] 切换分支 ${project.branch}...`, 'info');
                        let switchResult = await window.electronAPI.gitSwitchBranch(
                            pathJoin(project.savePath, repoName), project.branch
                        );
                        if (switchResult.success) logToTerminal(`[${name}] 切换成功`, 'success');
                        else logToTerminal(`[${name}] 切换失败`, 'error');
                    }

                    await sleep(300);

                    // IDE 打开
                    const idePath = document.getElementById('codingEditPath').value;
                    if (idePath) {
                        logToTerminal(`[${name}] 用 IDE 打开...`, 'info');
                        await window.electronAPI.openWithIDE(project.savePath, idePath);
                        logToTerminal(`[${name}] 已打开`, 'success');
                    }
                    break;

                case 2: // 清除 node_modules + npm i（原逻辑：clear_yl_npm_i）
                    const codePath2 = project.codePath ? pathJoin(project.savePath, project.codePath) : project.savePath;
                    logToTerminal(`[${name}] 清除依赖...`, 'info');
                    let clearResult = await window.electronAPI.clearNodeModules(codePath2);
                    if (clearResult.success) {
                        logToTerminal(`[${name}] 依赖已清除，开始 npm install...`, 'info');
                    } else {
                        logToTerminal(`[${name}] 清除依赖失败: ${clearResult.error}`, 'error');
                    }
                    await sleep(300);
                    let npm2Result = await window.electronAPI.npmInstall(codePath2);
                    if (npm2Result.success) logToTerminal(`[${name}] npm install 成功`, 'success');
                    else logToTerminal(`[${name}] npm install 失败: ${npm2Result.error}`, 'error');
                    break;

                case 3: // IDE 打开项目
                    const ide3 = document.getElementById('codingEditPath').value;
                    if (!ide3) { showMsg('请先选择 IDE！', false); break; }
                    logToTerminal(`[${name}] IDE 打开...`, 'info');
                    await window.electronAPI.openWithIDE(project.savePath, ide3);
                    logToTerminal(`[${name}] 已打开`, 'success');
                    break;

                case 4: // git pull + npm run dev（原逻辑：拉取代码到项目根，dev启动到codePath）
                    const projectPath4 = pathJoin(project.savePath, repoName); // 项目根目录（Git仓库）
                    const codePath4 = project.codePath ? pathJoin(project.savePath, project.codePath) : projectPath4;

                    logToTerminal(`[${name}] git pull (${projectPath4})...`, 'info');
                    let pullResult4 = await window.electronAPI.gitPull(projectPath4);
                    if (pullResult4.success) logToTerminal(`[${name}] pull 成功`, 'success');
                    else logToTerminal(`[${name}] pull 失败: ${pullResult4.error}`, 'error');

                    await sleep(300);

                    logToTerminal(`[${name}] npm run dev (${codePath4})...`, 'info');
                    let devResult4 = await window.electronAPI.npmRunDev(codePath4);
                    if (devResult4.success) logToTerminal(`[${name}] dev 已后台启动`, 'success');
                    else logToTerminal(`[${name}] dev 启动失败: ${devResult4.error}`, 'error');
                    break;

                case 5: // 按钮一 + 按钮二（clone+分支+IDE打开 + 清除+npm i）
                    // === 按钮1：git clone + 切换分支 + IDE打开 ===
                    logToTerminal(`[${name}] [5-1] git clone...`, 'info');
                    let c5 = await window.electronAPI.gitClone(project.gitUrl, project.savePath, project.branch);
                    if (c5.success) {
                        logToTerminal(`[${name}] [5-1] clone 成功`, 'success');

                        if (project.branch) {
                            await sleep(300);
                            logToTerminal(`[${name}] [5-1] 切换分支 ${project.branch}...`, 'info');
                            let sw5 = await window.electronAPI.gitSwitchBranch(pathJoin(project.savePath, repoName), project.branch);
                            logToTerminal(sw5.success ? `[${name}] [5-1] 切换成功` : `[${name}] [5-1] 切换失败`, sw5.success ? 'success' : 'error');
                        }

                        await sleep(300);

                        // IDE 打开
                        const ide5 = document.getElementById('codingEditPath').value;
                        if (ide5) {
                            logToTerminal(`[${name}] [5-1] 用 IDE 打开...`, 'info');
                            await window.electronAPI.openWithIDE(project.savePath, ide5);
                            logToTerminal(`[${name}] [5-1] 已打开`, 'success');
                        }
                    } else {
                        logToTerminal(`[${name}] [5-1] clone 失败: ${c5.error}`, 'error');
                    }

                    await sleep(500);

                    // === 按钮2：清除 node_modules + npm i ===
                    const codePath5 = project.codePath ? pathJoin(project.savePath, project.codePath) : project.savePath;
                    logToTerminal(`[${name}] [5-2] 清除依赖...`, 'info');
                    let clear5 = await window.electronAPI.clearNodeModules(codePath5);
                    if (clear5.success) logToTerminal(`[${name}] [5-2] 依赖已清除`, 'success');
                    else logToTerminal(`[${name}] [5-2] 清除失败: ${clear5.error}`, 'error');

                    await sleep(300);
                    logToTerminal(`[${name}] [5-2] npm install...`, 'info');
                    let npm5 = await window.electronAPI.npmInstall(codePath5);
                    if (npm5.success) logToTerminal(`[${name}] [5-2] npm install 成功`, 'success');
                    else logToTerminal(`[${name}] [5-2] npm install 失败: ${npm5.error}`, 'error');

                    logToTerminal(`[${name}] [5] 全部完成`, 'success');
                    break;
            }

            await sleep(800); // 项目间间隔
        }

        logToTerminal(`命令 [${flag}] 执行完成！`, 'success');
        showMsg(`命令 ${flag} 执行成功！`);
    } catch (e) {
        logToTerminal(`执行失败：${e.message}`, 'error');
        showMsg(`执行失败：${e.message}`, false);
    } finally {
        isExecuting = false;
        document.querySelectorAll('.function-btn').forEach(btn => btn.disabled = false);
    }
}

// 路径工具
function pathJoin(...parts) { return parts.filter(p => p).join('\\').replace(/[\\/]+/g, '\\'); }

// ==================== AI 平台导航 ====================

const aiPlatforms = [
    { name: '豆包', url: 'https://www.doubao.com/chat', desc: '字节跳动推出的 AI 助手，免费使用，适合日常对话', tag: '免费使用', category: 'domestic', logo: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/favicon/64x64.png' },
    { name: 'DeepSeek', url: 'https://chat.deepseek.com/', desc: '深度求索公司的 AI 助手，支持 128K 上下文和联网搜索', tag: '国产新秀', category: 'domestic', logo: 'https://fe-static.deepseek.com/chat/favicon.svg' },
    { name: 'Kimi Chat', url: 'https://kimi.moonshot.cn/', desc: '月之暗面推出的 AI 助手，支持 200K 上下文，擅长文件分析', tag: '国产热门', category: 'domestic', logo: 'https://kimi.moonshot.cn/favicon.ico' },
    { name: '通义千问', url: 'https://tongyi.aliyun.com/qianwen/', desc: '阿里巴巴推出的中文 AI 助手，集成阿里云生态', tag: '国产大厂', category: 'domestic', logo: 'https://img.alicdn.com/imgextra/i4/O1CN01x18T3k1wEvEeaQANu_!!6000000006277-55-tps-48-48.svg' },
    { name: '智谱清言', url: 'https://chatglm.cn/', desc: '智谱 AI 推出的 AI 助手，基于 GLM 模型，擅长编程', tag: '国产技术', category: 'domestic', logo: 'https://chatglm.cn/favicon.ico' },
    { name: 'Coze', url: 'https://www.coze.cn/', desc: '字节跳动推出的 AI 应用平台，支持自定义知识库和工作流', tag: 'AI 应用', category: 'domestic', logo: 'https://www.coze.cn/favicon.ico' },
    { name: '百川智能', url: 'https://www.baichuan-ai.com/', desc: '百川智能推出的 AI 助手，专注中文理解和多轮对话', tag: '国产技术', category: 'domestic', logo: 'https://www.baichuan-ai.com/favicon.ico' },
    { name: '360智脑', url: 'https://ai.360.com/', desc: '360 公司推出的 AI 助手，专注安全场景和企业应用', tag: '国产大厂', category: 'domestic', logo: 'https://ai.360.com/favicon.ico' },
    { name: '文心一言', url: 'https://yiyan.baidu.com/', desc: '百度推出的 AI 对话助手，基于文心大模型，擅长中文理解', tag: '国产大厂', category: 'domestic', logo: 'https://eb-static.cdn.bcebos.com/logo/favicon.ico' },
    { name: '腾讯元宝', url: 'https://yuanbao.tencent.com/chat/naQivTmsDa', desc: '腾讯推出的 AI 助手，集成多种能力，支持多场景对话', tag: '国产大厂', category: 'domestic', logo: 'https://yuanbao.tencent.com/favicon.ico' },
    { name: 'OpenAI ChatGPT', url: 'https://chat.openai.com/', desc: 'OpenAI 推出的 AI 对话助手，支持 GPT-4 等多种模型，功能全面', tag: '国际热门', category: 'foreign', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
    { name: 'Claude AI', url: 'https://claude.ai/', desc: 'Anthropic 公司开发的 AI 助手，注重安全性和长篇写作', tag: '国际热门', category: 'foreign', logo: 'https://claude.ai/favicon.ico' },
    { name: 'Google Gemini', url: 'https://gemini.google.com/', desc: 'Google 推出的 AI 助手，集成 Google 搜索和图像生成功能', tag: '国际大厂', category: 'foreign', logo: 'https://www.gstatic.com/images/branding/product/2x/gemini_48dp.png' },
    { name: 'GitHub Copilot', url: 'https://github.com/features/copilot', desc: '微软推出的 AI 编程助手，集成在编辑器中，支持代码补全', tag: '编程利器', category: 'foreign', logo: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' }
];

function renderAIChatGrid() {
    const domestic = aiPlatforms.filter(p => p.category === 'domestic');
    const foreign = aiPlatforms.filter(p => p.category === 'foreign');

    const cardHtml = p => `
        <div class="ai-card" onclick="window.electronAPI.openExternal('${p.url}')">
            <div class="brand-header">
                <img src="${p.logo}" alt="${p.name}" class="brand-logo" onerror="this.style.display='none'">
                <span class="brand-name">${p.name}</span>
            </div>
            <p class="brand-description">${p.desc}</p>
            <div class="card-footer">
                <span class="card-tag">${p.tag}</span>
                <span class="card-arrow">→</span>
            </div>
        </div>`;

    document.getElementById('aiDomesticGrid').innerHTML = domestic.map(cardHtml).join('');
    document.getElementById('aiForeignGrid').innerHTML = foreign.map(cardHtml).join('');
}

// ==================== AI 模型查询 ====================

async function searchModel() {
    const modelId = document.getElementById('modelSearchInput').value.trim();
    if (!modelId) { showMsg('请输入模型 ID', false); return; }
    const server = document.getElementById('modelServerSelect').value;
    terminalLog.innerHTML = ''; // 清空日志区
    logToTerminal(`查询模型: ${modelId}`, 'info');
    logToTerminal(`服务器: ${server}`, 'info');

    document.getElementById('modelResults').innerHTML = '<div class="empty-tip">查询中...</div>';

    try {
        const response = await fetch(`${server}/v1/models/${modelId}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('modelResults').innerHTML = `
                <div class="model-result-item">
                    <div class="model-id">${data.id || modelId}</div>
                    <div class="model-info">
                        <p>创建时间: ${data.created ? new Date(data.created * 1000).toLocaleString() : '未知'}</p>
                        <p>对象: ${data.object || 'unknown'}</p>
                    </div>
                </div>`;
            logToTerminal(`查询成功: ${modelId}`, 'success');
        } else {
            document.getElementById('modelResults').innerHTML =
                '<div class="empty-tip">模型不存在或查询失败<br>状态码: ' + response.status + '</div>';
            logToTerminal(`查询失败: ${response.status}`, 'error');
        }
    } catch (e) {
        document.getElementById('modelResults').innerHTML = '<div class="empty-tip">查询出错<br>' + escapeHtml(e.message) + '</div>';
        logToTerminal(`查询错误: ${e.message}`, 'error');
    }
}

// ==================== AI Model IDs 查询页面 ====================

// ==================== AI Model IDs 配置（持久化）====================
// 默认配置
const AIM_DEFAULT_CONFIGS = [
    { name: 'API 1', url: 'http://192.168.82.252:8318/v1', key: 'sk-01-33012860-73a4-465b-be66-73c3b618eca3' },
    { name: 'API 2', url: 'http://192.168.82.252:8319/v1', key: 'sk-02-21c522d2-4dce-4af2-aa24-11f79d8c4a2f' },
    { name: 'API 3', url: 'http://192.168.82.252:8320/v1', key: 'sk-03-5b4bc65b-69c6-42c6-9395-daf862cf5584' },
    { name: 'API 4', url: 'https://ai.pocangqiong.com/v1', key: 'sk-gHRdfSkRvuxPkfrvj71abyw7tyrJ7MuvIBLS5l86D4jtBHkw' }
];

const AIM_STORAGE_KEY = 'aimApiConfigs';
let aimApiConfigs = [];
let aimAllModels = [];
let aimGroupedModels = {};
let aimCurrentTab = '全部';
let aimCurrentIdx = 0;

// 初始化：从 localStorage 读取，无则用默认
function initAimApiConfigs() {
    try {
        const stored = localStorage.getItem(AIM_STORAGE_KEY);
        aimApiConfigs = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(AIM_DEFAULT_CONFIGS));
    } catch (e) {
        aimApiConfigs = JSON.parse(JSON.stringify(AIM_DEFAULT_CONFIGS));
    }
    // 保证至少有1条
    if (aimApiConfigs.length === 0) {
        aimApiConfigs = JSON.parse(JSON.stringify(AIM_DEFAULT_CONFIGS));
    }
}

function saveAimApiConfigs() {
    localStorage.setItem(AIM_STORAGE_KEY, JSON.stringify(aimApiConfigs));
}

// 渲染顶部 Tab（根据配置动态生成）
function renderAimApiTabs() {
    const container = document.getElementById('aimApiTabsContainer');
    if (!container) return;
    container.innerHTML = aimApiConfigs.map((cfg, i) =>
        `<div class="aim-api-tab ${i === aimCurrentIdx ? 'active' : ''}" data-idx="${i}">${escapeHtml(cfg.name)}</div>`
    ).join('');
    // 绑定点击事件
    container.querySelectorAll('.aim-api-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const idx = parseInt(tab.dataset.idx);
            aimCurrentIdx = idx;
            container.querySelectorAll('.aim-api-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('aimApiUrl').value = aimApiConfigs[idx].url;
            document.getElementById('aimApiKey').value = aimApiConfigs[idx].key;
            aimFetchModels();
        });
    });
}

function renderAIModelsPage() {
    initAimApiConfigs();
    renderAimApiTabs();
    // 填充当前选中配置
    if (aimApiConfigs[aimCurrentIdx]) {
        document.getElementById('aimApiUrl').value = aimApiConfigs[aimCurrentIdx].url;
        document.getElementById('aimApiKey').value = aimApiConfigs[aimCurrentIdx].key;
    }
    const fetchBtn = document.getElementById('aimFetchBtn');
    if (fetchBtn) fetchBtn.onclick = () => aimFetchModels();
}

// ==================== 管理配置面板 ====================

function aimShowManagePanel() {
    const panel = document.getElementById('aimManagePanel');
    panel.style.display = 'block';
    renderManageList();
}

function aimHideManagePanel() {
    document.getElementById('aimManagePanel').style.display = 'none';
}

function renderManageList() {
    const list = document.getElementById('aimManageList');
    list.innerHTML = aimApiConfigs.map((cfg, i) => `
        <div class="aim-manage-item">
            <div class="aim-manage-item-info">
                <input type="text" class="aim-manage-name" value="${escapeHtml(cfg.name)}" data-idx="${i}" onchange="aimEditConfig(${i}, 'name', this.value)">
                <input type="text" class="aim-manage-url" value="${escapeHtml(cfg.url)}" data-idx="${i}" onchange="aimEditConfig(${i}, 'url', this.value)">
                <input type="text" class="aim-manage-key" value="${escapeHtml(cfg.key)}" data-idx="${i}" onchange="aimEditConfig(${i}, 'key', this.value)">
            </div>
            <div class="aim-manage-item-actions">
                <button class="aim-del-btn" onclick="aimDeleteConfig(${i})">删除</button>
            </div>
        </div>
    `).join('');
}

function aimEditConfig(idx, field, value) {
    if (aimApiConfigs[idx]) {
        aimApiConfigs[idx][field] = value;
        saveAimApiConfigs();
        renderAimApiTabs();
        // 如果编辑的是当前选中的，更新输入框
        if (idx === aimCurrentIdx) {
            document.getElementById('aimApiUrl').value = aimApiConfigs[idx].url;
            document.getElementById('aimApiKey').value = aimApiConfigs[idx].key;
        }
    }
}

function aimDeleteConfig(idx) {
    if (aimApiConfigs.length <= 1) {
        aimShowToast('至少需要保留一条配置');
        return;
    }
    aimApiConfigs.splice(idx, 1);
    saveAimApiConfigs();
    if (aimCurrentIdx >= aimApiConfigs.length) aimCurrentIdx = aimApiConfigs.length - 1;
    renderAimApiTabs();
    renderManageList();
    // 更新输入框
    document.getElementById('aimApiUrl').value = aimApiConfigs[aimCurrentIdx].url;
    document.getElementById('aimApiKey').value = aimApiConfigs[aimCurrentIdx].key;
    aimShowToast('已删除配置');
}

function aimAddConfig() {
    const name = document.getElementById('aimNewName').value.trim();
    const url = document.getElementById('aimNewUrl').value.trim();
    const key = document.getElementById('aimNewKey').value.trim();
    if (!name || !url || !key) {
        aimShowToast('请填写名称、URL 和 Key');
        return;
    }
    aimApiConfigs.push({ name, url, key });
    saveAimApiConfigs();
    renderAimApiTabs();
    renderManageList();
    document.getElementById('aimNewName').value = '';
    document.getElementById('aimNewUrl').value = '';
    document.getElementById('aimNewKey').value = '';
    aimShowToast('新增配置成功');
}

function aimShowToast(text) {
    const t = document.getElementById('aimToast');
    t.textContent = text;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 1600);
}

function aimCopyText(text, cardEl) {
    navigator.clipboard.writeText(text).then(() => {
        aimShowToast(`已复制: ${text}`);
        cardEl.classList.add('copied');
        setTimeout(() => cardEl.classList.remove('copied'), 1000);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        aimShowToast(`已复制: ${text}`);
    });
}

// ==================== 主题切换 ====================

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggle');
    btn.textContent = saved === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const btn = document.getElementById('themeToggle');
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
}
function aimGetGroup(modelId) {
    return modelId.split('-')[0] || '其他';
}

function aimGroupModels(models) {
    const groups = {};
    models.forEach(id => {
        const g = aimGetGroup(id);
        if (!groups[g]) groups[g] = [];
        groups[g].push(id);
    });
    Object.keys(groups).forEach(k => groups[k].sort());
    return groups;
}

function aimRenderTabs() {
    const el = document.getElementById('aimTabs');
    const keys = Object.keys(aimGroupedModels).sort();
    let html = `<div class="aim-tab ${aimCurrentTab === '全部' ? 'active' : ''}" onclick="aimSwitchTab('全部')">全部<span class="aim-count">(${aimAllModels.length})</span></div>`;
    keys.forEach(k => {
        const c = aimGroupedModels[k].length;
        html += `<div class="aim-tab ${aimCurrentTab === k ? 'active' : ''}" onclick="aimSwitchTab('${escapeHtml(k)}')">${escapeHtml(k)}<span class="aim-count">(${c})</span></div>`;
    });
    el.innerHTML = html;
}

function aimRenderModels() {
    const contentEl = document.getElementById('aimContent');
    const statsEl = document.getElementById('aimStats');
    let models = (aimCurrentTab === '全部')
        ? [...aimAllModels].sort()
        : (aimGroupedModels[aimCurrentTab] || []);
    statsEl.textContent = `当前显示 ${models.length} 个模型`;
    if (models.length === 0) {
        contentEl.innerHTML = '<div class="aim-loading aim-placeholder">该分组下没有模型</div>';
        return;
    }
    contentEl.innerHTML = '<div class="aim-models-grid">' + models.map(id =>
        `<div class="aim-model-card" onclick="aimCopyText('${escapeHtml(id)}', this)"><span class="aim-name">${escapeHtml(id)}</span><span class="aim-copy-icon">&#x1F4CB;</span></div>`
    ).join('') + '</div>';
}

function aimSwitchTab(tab) {
    aimCurrentTab = tab;
    aimRenderTabs();
    aimRenderModels();
}

async function aimFetchModels() {
    const apiUrl = document.getElementById('aimApiUrl').value.trim();
    const apiKey = document.getElementById('aimApiKey').value.trim();

    if (!apiUrl || !apiKey) {
        aimShowToast('请填写 API URL 和 Key');
        return;
    }

    const contentEl = document.getElementById('aimContent');
    contentEl.innerHTML = '<div class="aim-loading">正在查询模型列表...</div>';
    document.getElementById('aimTabs').innerHTML = '';
    document.getElementById('aimStats').textContent = '';

    try {
        const res = await fetch(`${apiUrl}/models`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const json = await res.json();
        if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));

        aimAllModels = json.data.map(item => item.id);
        aimGroupedModels = aimGroupModels(aimAllModels);
        aimCurrentTab = '全部';
        aimRenderTabs();
        aimRenderModels();
    } catch (e) {
        contentEl.innerHTML = `<div class="aim-error">查询失败: ${e.message}</div>`;
    }
}

// ==================== 回到顶部 & 滚动 ====================

const backToTopBtn = document.getElementById('backToTop');
const configListEl = document.getElementById('configList');
configListEl.addEventListener('scroll', () => {
    backToTopBtn.style.display = configListEl.scrollTop > 200 ? 'block' : 'none';
});
backToTopBtn.addEventListener('click', () => configListEl.scrollTo({ top: 0, behavior: 'smooth' }));

// ==================== 事件绑定 ====================

function bindEvents() {
    // 终端控制
    document.getElementById('closeTerminalBtn').addEventListener('click', () => {
        terminalPanel.style.display = 'none';
    });
    document.getElementById('clearTerminalBtn2').addEventListener('click', () => {
        terminalLog.innerHTML = '';
        logToTerminal('日志已清空', 'info');
    });

    // 悬浮按钮
    document.getElementById('addItem').addEventListener('click', () => {
        const ni = createConfigItem({ enable: false });
        document.getElementById('configList').appendChild(ni);
        updateEnabledItemsPanel();
        updatePNameTabs();
        ni.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('saveAll').addEventListener('click', saveConfig);
    document.getElementById('refresh').addEventListener('click', loadConfig);
    document.getElementById('addEditPath').addEventListener('click', () => {
        const ni = createEditPathItem('');
        document.getElementById('editPathList').appendChild(ni);
        ni.scrollIntoView({ behavior: 'smooth' });
    });

    // 功能按钮 1-5
    document.getElementById('btn-1').addEventListener('click', () => executeCommand(1));
    document.getElementById('btn-2').addEventListener('click', () => executeCommand(2));
    document.getElementById('btn-3').addEventListener('click', () => executeCommand(3));
    document.getElementById('btn-4').addEventListener('click', () => executeCommand(4));
    document.getElementById('btn-5').addEventListener('click', () => executeCommand(5));

    // 主题切换
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // IDE 选择变化
    document.getElementById('codingEditPath').addEventListener('change', async (e) => {
        config.CodingEditPath = e.target.value;
        await window.electronAPI.saveConfig(config);
    });
}

// ==================== 启动 ====================

async function init() {
    bindEvents();

    // 主题初始化
    initTheme();
    
    await loadConfig();

    // 监听命令输出
    commandOutputUnsubscribe = window.electronAPI.onCommandOutput((data) => {
        if (data.type === 'log') logToTerminal(data.data.trim(), 'info');
    });

    logToTerminal('Clone-NPM Desktop 已启动', 'success');
}

// 兼容：如果 DOM 已经加载完毕则直接执行，否则等待事件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
