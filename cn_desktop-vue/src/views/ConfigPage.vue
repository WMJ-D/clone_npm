<template>
  <div class="config-page">
    <!-- 顶部导航 -->
    <header class="cfg-header">
      <div class="cfg-header-left">
        <h1 class="cfg-title">Clone-NPM</h1>
        <span class="cfg-subtitle">项目配置管理中心</span>
      </div>
      <div class="cfg-header-actions">
        <el-button type="primary" @click="handleAddItem">
          <el-icon><Plus /></el-icon> 新增项目
        </el-button>
        <el-button type="success" @click="handleSave">
          <el-icon><DocumentChecked /></el-icon> 保存配置
        </el-button>
        <el-button @click="handleRefresh">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="$router.push('/ai-models')">
          <el-icon><Connection /></el-icon> AI模型API
        </el-button>
        <el-button @click="$router.push('/ai-chat')">
          <el-icon><ChatDotRound /></el-icon> AI智能助手
        </el-button>
        <el-link type="info" :underline="false" @click="showHelpDialog = true" class="help-link">
          <el-icon><QuestionFilled /></el-icon> 操作说明
        </el-link>
      </div>
    </header>

    <!-- IDE 配置区 -->
    <div class="cfg-ide-panel">
      <div class="cfg-ide-header">
        <span><el-icon><Setting /></el-icon> IDE 配置</span>
        <el-button size="small" type="primary" @click="handleAddEditPath">
          <el-icon><Plus /></el-icon> 添加编辑器
        </el-button>
      </div>
      <div class="cfg-ide-body">
        <div class="cfg-ide-select">
          <label>当前 IDE：</label>
          <el-select v-model="configStore.CodingEditPath" placeholder="请选择编辑器路径"  style="width: 300px">
            <el-option v-for="p in configStore.CodingEditPathList" :key="p" :label="p" :value="p" />
          </el-select>
        </div>
        <div class="cfg-path-list">
          <div v-for="(p, i) in configStore.CodingEditPathList" :key="i" class="cfg-path-item">
            <el-icon><Document /></el-icon>
            <span :title="p">{{ p }}</span>
            <el-button type="danger" size="small" link @click="removeEditPath(i)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <div v-if="configStore.CodingEditPathList.length === 0" class="cfg-path-empty">
            暂无编辑器，请点击「添加编辑器」选择
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容区 -->
    <div class="cfg-main">
      <!-- 左侧分组导航 -->
      <aside class="cfg-sidebar">
        <div class="cfg-sidebar-header">
          <span>📁 项目分组</span>
          <span class="cfg-project-count">{{ configStore.totalCount }}</span>
        </div>
        <div class="cfg-sidebar-tabs">
          <div :class="['cfg-tab-item', { active: configStore.activeFilter === 'all' }]" @click="configStore.setFilter('all')">
            <span>📋</span><span>全部项目</span>
          </div>
          <div v-for="[pName, items] in configStore.groupedByPName" :key="pName"
               :class="['cfg-tab-item', { active: configStore.activeFilter === pName }]"
               @click="configStore.setFilter(pName)">
            <span>📁</span><span>{{ pName }}</span><span class="count">{{ items.length }}</span>
          </div>
        </div>

        <!-- 已勾选执行项 -->
        <div class="cfg-enabled-section">
          <div class="cfg-enabled-header">
            <span>✅ 已勾选执行</span>
            <span class="cfg-enabled-count">{{ configStore.enabledItems.length }}</span>
          </div>
          <div class="cfg-enabled-list">
            <div v-if="configStore.enabledItems.length === 0" class="cfg-enabled-empty">暂无勾选</div>
            <div v-for="item in configStore.enabledItems" :key="item.id" class="cfg-enabled-item" @click="scrollToItem(item)">
              <span>{{ item.projectName || '未命名' }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧内容 -->
      <main class="cfg-content">
        <!-- 功能按钮栏 -->
        <div class="cfg-action-bar">
          <el-button class="action-btn action-1" @click="handleAction(1)">
            <span>📥</span><span>Clone + 分支 + IDE</span>
          </el-button>
          <el-button class="action-btn action-2" @click="handleAction(2)">
            <span>🗑️</span><span>清除 + 重装</span>
          </el-button>
          <el-button class="action-btn action-3" @click="handleAction(3)">
            <span>💻</span><span>IDE 打开</span>
          </el-button>
          <el-button class="action-btn action-4" @click="handleAction(4)">
            <span>🚀</span><span>拉取 + 启动</span>
          </el-button>
          <el-button class="action-btn action-5" @click="handleAction(5)">
            <span>⚡</span><span>一键完成</span>
          </el-button>
        </div>

        <!-- 配置列表和终端 -->
        <div class="cfg-list-container">
          <div class="cfg-config-list" ref="configListRef">
            <ConfigItem 
              style="margin-bottom: 10px;"
              v-for="item in configStore.filteredItems" 
              :key="item.id" 
              :item="item"
              :ide-path="configStore.CodingEditPath"
              @delete="handleDeleteItem"
              @action="handleItemAction"
            />
            <div v-if="configStore.filteredItems.length === 0" class="cfg-empty">
              <div class="cfg-empty-icon">📋</div>
              <div class="cfg-empty-text">暂无项目配置</div>
              <el-button type="primary" @click="handleAddItem">新增项目</el-button>
            </div>
          </div>
          <!-- 回到顶部按钮 -->
          <transition name="fade">
            <el-button v-if="showBackToTop" class="back-to-top" type="primary" circle @click="scrollToTop">
              <el-icon><Top /></el-icon>
            </el-button>
          </transition>
          <TerminalPanel />
        </div>
      </main>
    </div>

    <!-- 操作说明对话框 -->
    <el-dialog v-model="showHelpDialog" title="操作说明" width="600px" class="help-dialog">
      <div class="help-content">
        <h3>🚀 快速开始</h3>
        <ol>
          <li><strong>新增项目</strong>：点击顶部「新增项目」按钮，填写 Git 地址、分支、保存路径等信息</li>
          <li><strong>保存配置</strong>：填写完成后点击「保存配置」，配置会持久化存储</li>
          <li><strong>勾选项目</strong>：在项目卡片左侧勾选需要批量操作的项目</li>
        </ol>

        <h3>⚡ 五大操作</h3>
        <table class="help-table">
          <tr>
            <td><strong>Clone + 分支 + IDE</strong></td>
            <td>克隆仓库 → 切换分支 → 用 IDE 打开</td>
          </tr>
          <tr>
            <td><strong>清除 + 重装</strong></td>
            <td>删除 node_modules → 清除缓存 → 重新安装依赖</td>
          </tr>
          <tr>
            <td><strong>IDE 打开</strong></td>
            <td>用配置的 IDE 编辑器打开项目目录</td>
          </tr>
          <tr>
            <td><strong>拉取 + 启动</strong></td>
            <td>git pull 更新代码 → npm run dev 启动开发服务器</td>
          </tr>
          <tr>
            <td><strong>一键完成</strong></td>
            <td>Clone → 切分支 → IDE 打开 → 安装依赖（全流程自动化）</td>
          </tr>
        </table>

        <h3>💡 使用技巧</h3>
        <ul>
          <li>点击顶部按钮会批量操作所有<strong>已勾选</strong>的项目</li>
          <li>点击项目卡片底部的按钮可对<strong>单个项目</strong>执行操作</li>
          <li>左侧边栏可按<strong>项目分组</strong>筛选，点击「已勾选执行」可快速定位</li>
          <li>右侧终端面板会实时显示命令执行过程</li>
          <li>「子路径」字段用于指定代码在仓库中的位置，如 <code>\webapp</code></li>
        </ul>

        <h3>🔧 IDE 配置</h3>
        <ul>
          <li>点击「添加编辑器」选择 IDE 的 exe 文件路径</li>
          <li>支持多个 IDE，下拉选择当前使用的编辑器</li>
          <li>常用路径：VS Code、Trae、Cursor、CodeBuddy 等</li>
        </ul>
      </div>
      <template #footer>
        <el-button type="primary" @click="showHelpDialog = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import { useTerminalStore } from '@/stores/terminal'
import ConfigItem from '@/components/config/ConfigItem.vue'
import TerminalPanel from '@/components/layout/TerminalPanel.vue'

const configStore = useConfigStore()
const terminalStore = useTerminalStore()
const configListRef = ref(null)
const showBackToTop = ref(false)
const showHelpDialog = ref(false)

onMounted(async () => {
  await configStore.loadConfig()
  terminalStore.initListener()
  
  // 监听滚动显示回到顶部按钮
  if (configListRef.value) {
    configListRef.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  if (configListRef.value) {
    configListRef.value.removeEventListener('scroll', handleScroll)
  }
})

function handleScroll() {
  if (configListRef.value) {
    showBackToTop.value = configListRef.value.scrollTop > 200
  }
}

function scrollToTop() {
  if (configListRef.value) {
    configListRef.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function getFileName(path) {
  if (!path) return ''
  return path.split('\\').pop() || path.split('/').pop() || path
}

async function handleSave() {
  try {
    const success = await configStore.saveConfig()
    if (success) {
      window.__toast('配置保存成功！', 'success')
      terminalStore.addLog('配置已保存', 'success')
    } else {
      window.__toast('保存失败', 'error')
    }
  } catch (e) {
    window.__toast('保存失败: ' + e.message, 'error')
  }
}

function handleRefresh() {
  configStore.loadConfig()
  window.__toast('已刷新')
}

function handleAddItem() {
  configStore.setFilter('all')
  configStore.addConfigItem()
  nextTick(() => {
    if (configListRef.value) {
      configListRef.value.scrollTop = configListRef.value.scrollHeight
    }
  })
}

function handleDeleteItem(item) {
  ElMessageBox.confirm(`确定删除项目「${item?.projectName || '未命名'}」吗？`, '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = configStore.configList.findIndex(i => i.id === item.id)
    if (index > -1) configStore.removeConfigItem(index)
    window.__toast('已删除', 'success')
  }).catch(() => {})
}

function handleItemAction(action, item) {
  handleSingleAction(action, item)
}

function handleAddEditPath() {
  window.electronAPI.selectFile({ filters: [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat'] }] }).then(path => {
    if (path && !configStore.CodingEditPathList.includes(path)) {
      configStore.CodingEditPathList.push(path)
      // 如果是第一个，自动选中
      if (configStore.CodingEditPathList.length === 1) {
        configStore.CodingEditPath = path
      }
      window.__toast('已添加编辑器', 'success')
    }
  })
}

function removeEditPath(index) {
  const removed = configStore.CodingEditPathList[index]
  ElMessageBox.confirm(`确定删除编辑器「${getFileName(removed)}」吗？`, '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    configStore.CodingEditPathList.splice(index, 1)
    if (configStore.CodingEditPath === removed) {
      configStore.CodingEditPath = ''
    }
    window.__toast('已删除', 'success')
  }).catch(() => {})
}

function scrollToItem(item) {
  // 优先用 projectName 查找，其次用 id
  let el = null
  if (item.projectName) {
    el = document.querySelector(`[data-project-name="${item.projectName}"]`)
  }
  if (!el && item.id) {
    el = document.querySelector(`[data-item-id="${item.id}"]`)
  }
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function handleAction(action) {
  const items = configStore.enabledItems
  if (items.length === 0) {
    window.__toast('请先勾选要执行的项目', 'warning')
    return
  }

  terminalStore.show()
  for (const item of items) {
    await handleSingleAction(action, item)
  }
  terminalStore.addLog('全部操作完成', 'success')
  window.__toast('执行完成', 'success')
}

function pathJoin(...parts) { return parts.filter(p => p).join('\\').replace(/[\\/]+/g, '\\'); }

function getProjectName(gitUrl) {
    const m = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return m ? m[1] : null;
}

async function handleSingleAction(action, item) {
  const fullPath = item.codePath ? pathJoin(item.savePath, item.codePath) : item.savePath;
  terminalStore.addLog(`开始处理: ${item.projectName || '未命名'}`, 'info')
  const repoName = getProjectName(item.gitUrl);
  try {
    if (action === 1) {
      // Clone + 分支 + IDE
      if (!item.gitUrl || !item.savePath) {
        terminalStore.addLog(`[${item.projectName}] Git地址或保存路径不完整，跳过`, 'error')
        return
      }
      terminalStore.show()
      const cloneRes = await window.electronAPI.gitClone(item.gitUrl, item.savePath, item.branch)
      if (!cloneRes.success) {
        terminalStore.addLog(`[${item.projectName}] Clone失败: ${cloneRes.error}`, 'error')
        return
      }
      terminalStore.setCurrentTerm(cloneRes.termId)
      terminalStore.addLog(`[${item.projectName}] Clone成功: ${cloneRes.targetPath}`, 'success')

      if (item.branch && item.branch !== 'master') {
        terminalStore.addLog(`[${item.projectName}] 正在切换分支...`, 'info')
        await window.electronAPI.gitSwitchBranch(pathJoin(item.savePath, repoName), item.branch)
      }

      if (configStore.CodingEditPath) {
        await window.electronAPI.openWithIDE(item.savePath, configStore.CodingEditPath)
      }
    } else if (action === 2) {
      // 清除 + 重装
      terminalStore.show()
      const clearRes = await window.electronAPI.clearNodeModules(fullPath)
      if (clearRes.success) {
        terminalStore.setCurrentTerm(clearRes.termId)
        terminalStore.addLog(`[${item.projectName}] 开始安装依赖...`, 'info')
        const installRes = await window.electronAPI.npmInstall(fullPath)
        if (installRes.success) {
          terminalStore.setCurrentTerm(installRes.termId)
        }
      } else {
        terminalStore.addLog(`[${item.projectName}] 清除失败: ${clearRes.error}`, 'error')
      }
    } else if (action === 3) {
      // IDE 打开
      if (configStore.CodingEditPath) {
        await window.electronAPI.openWithIDE(item.savePath, configStore.CodingEditPath)
      } else {
        terminalStore.addLog('请先配置IDE路径', 'warning')
      }
    } else if (action === 4) {
      // 拉取 + 启动
      const pp4 = pathJoin(item.savePath, repoName)
      terminalStore.show()
      terminalStore.addLog(`[${item.projectName}] 正在拉取代码...`, 'info')
      const pullRes = await window.electronAPI.gitPull(pp4)
      
      if (pullRes.success) {
        terminalStore.setCurrentTerm(pullRes.termId)
      }
      
      // 使用 PTY 终端启动 dev
      const devRes = await window.electronAPI.npmRunDev(fullPath)
      if (devRes.success) {
        terminalStore.setCurrentTerm(devRes.termId)
        terminalStore.addLog(`[${item.projectName}] 已启动开发服务器`, 'success')
      } else {
        terminalStore.addLog(`[${item.projectName}] 启动失败: ${devRes.error}`, 'error')
      }
    } else if (action === 5) {
      // 一键完成
      if (!item.gitUrl || !item.savePath) return
      terminalStore.show()
      const cloneRes = await window.electronAPI.gitClone(item.gitUrl, item.savePath, item.branch)
      if (cloneRes.success) {
        terminalStore.setCurrentTerm(cloneRes.termId)
        terminalStore.addLog(`[${item.projectName}] 正在切换分支...`, 'info')
        if (item.branch && item.branch !== 'master') {
          await window.electronAPI.gitSwitchBranch(pathJoin(item.savePath, repoName), item.branch)
        }
        if (configStore.CodingEditPath) {
          await window.electronAPI.openWithIDE(item.savePath, configStore.CodingEditPath)
        }
        terminalStore.addLog(`[${item.projectName}] 开始安装依赖...`, 'info')
        await window.electronAPI.npmInstall(fullPath)
      }
    }
  } catch (e) {
    terminalStore.addLog(`[${item.projectName}] 执行出错: ${e.message}`, 'error')
  }
}
</script>

<style lang="scss" scoped>
.config-page { display: flex; flex-direction: column; height: 100vh; background: #1a1a2e; }

.cfg-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: #16213e; border-bottom: 1px solid rgba(255,255,255,0.1);
  .cfg-header-left { display: flex; align-items: baseline; gap: 12px; }
  .cfg-title { font-size: 20px; font-weight: 600; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .cfg-subtitle { color: #a1a1aa; font-size: 13px; }
  .cfg-header-actions { display: flex; gap: 8px; }
}

.cfg-ide-panel {
  background: #1e2a4a; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 12px 20px;
  .cfg-ide-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-weight: 500; }
  .cfg-ide-body { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
  .cfg-ide-select { display: flex; align-items: center; gap: 12px; label { color: #a1a1aa; white-space: nowrap; } }
  .cfg-path-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .cfg-path-item { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 6px; font-size: 13px; 
    span { max-width: 500px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }
  .cfg-path-empty { color: #666; font-size: 13px; }
}

.cfg-main { flex: 1; display: flex; overflow: hidden; }

.cfg-sidebar {
  width: 220px; background: #16213e; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; overflow: hidden;
  .cfg-sidebar-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 13px; }
  .cfg-project-count { background: rgba(102,126,234,0.3); padding: 2px 8px; border-radius: 10px; font-size: 12px; }
  .cfg-sidebar-tabs { flex: 1; overflow-y: auto; padding: 8px; }
  .cfg-tab-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px; cursor: pointer; color: #a1a1aa; transition: all 0.2s; margin-bottom: 4px;
    &:hover { background: rgba(255,255,255,0.05); color: #e4e4e7; }
    &.active { background: linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.2)); color: #fff; }
    .count { margin-left: auto; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 8px; font-size: 11px; }
  }
}

.cfg-enabled-section {
  border-top: 1px solid rgba(255,255,255,0.1); padding: 12px;
  .cfg-enabled-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #a1a1aa; }
  .cfg-enabled-count { background: rgba(34,197,94,0.3); padding: 2px 8px; border-radius: 10px; }
  .cfg-enabled-list { max-height: 150px; overflow-y: auto; }
  .cfg-enabled-empty { color: #666; font-size: 12px; text-align: center; padding: 12px; }
  .cfg-enabled-item { padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #a1a1aa; &:hover { background: rgba(255,255,255,0.05); color: #fff; } }
}

.cfg-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.cfg-action-bar { display: flex; gap: 8px; padding: 12px 16px; background: #16213e; border-bottom: 1px solid rgba(255,255,255,0.1); 
  .action-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #e4e4e7; cursor: pointer; transition: all 0.2s;
    &:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
    &.action-1 { border-color: rgba(102,126,234,0.5); } &.action-2 { border-color: rgba(239,68,68,0.5); } &.action-3 { border-color: rgba(34,197,94,0.5); }
    &.action-4 { border-color: rgba(245,158,11,0.5); } &.action-5 { border-color: rgba(168,85,247,0.5); }
  }
}

.cfg-list-container {position: relative; display: flex; flex: 1; height: 400px;}
.cfg-config-list { flex: 1; padding: 16px; overflow: auto;  }

.back-to-top {
  position: absolute; bottom: 20px; right: 20px; z-index: 10;
  width: 40px; height: 40px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.cfg-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; color: #666;
  .cfg-empty-icon { font-size: 48px; margin-bottom: 16px; }
  .cfg-empty-text { margin-bottom: 20px; font-size: 14px; }
}

.help-link {
  margin-left: 8px;
  font-size: 13px;
  color: #a1a1aa;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: #667eea; }
}

.help-content {
  h3 {
    font-size: 16px;
    margin: 20px 0 12px;
    padding-left: 8px;
    border-left: 3px solid #667eea;
    &:first-child { margin-top: 0; }
  }
  ol, ul {
    padding-left: 20px;
    li {
      margin-bottom: 8px;
      line-height: 1.6;
      color: #c9d1d9;
      strong { color: #e4e4e7; }
    }
  }
  code {
    background: rgba(102,126,234,0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: #a5b4fc;
  }
}

.help-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  td {
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 13px;
    &:first-child {
      width: 180px;
      color: #a5b4fc;
      white-space: nowrap;
    }
    &:last-child { color: #c9d1d9; }
  }
  tr:hover td { background: rgba(255,255,255,0.03); }
}
</style>

<style lang="scss">
.help-dialog.el-dialog {
  background: #1a1a2e !important;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;

  .el-dialog__header {
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding: 16px 20px;
    margin-right: 0;
    .el-dialog__title { color: #e4e4e7; font-size: 18px; font-weight: 600; }
    .el-dialog__headerbtn .el-icon { color: #a1a1aa; &:hover { color: #667eea; } }
  }
  .el-dialog__body { padding: 20px; color: #e4e4e7; }
  .el-dialog__footer {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding: 16px 20px;
    .el-button--primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      &:hover { opacity: 0.9; }
    }
  }
}
</style>
