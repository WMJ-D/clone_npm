<template>
  <div class="config-item" :data-item-id="item.id" :data-project-name="item.projectName">
    <!-- 卡片头部 -->
    <div class="item-header">
      <el-checkbox v-model="item.enable" />
      <div class="item-index">{{ item._index || 0 }}</div>
      <div class="item-title">
        <el-input v-model="item.pName" placeholder="项目名称：如 山东省黄金地勘" size="small" />
        <el-input v-model="item.projectName" placeholder="系统名称：如 鹰眼智展大屏" size="small" />
      </div>
      <el-button type="danger" size="small" link @click="$emit('delete', item)">
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>

    <!-- 表单内容 -->
    <div class="item-body">
      <div class="item-row">
        <label><el-icon><Link /></el-icon> Git</label>
        <el-input v-model="item.gitUrl" placeholder="http://xxx.git" />
        <el-button size="small" @click="openGitUrl" :disabled="!item.gitUrl">
          <el-icon><View /></el-icon>
        </el-button>
      </div>
      <div class="item-row">
        <label><el-icon><Share /></el-icon> 分支</label>
        <el-input v-model="item.branch" placeholder="默认：master" />
      </div>
      <div class="item-row">
        <label><el-icon><FolderOpened /></el-icon> 路径</label>
        <el-input v-model="item.savePath" placeholder="D:\Projects\xxx" />
        <el-button size="small" @click="selectSavePath">
          <el-icon><FolderAdd /></el-icon>
        </el-button>
      </div>
      <div class="item-row">
        <label><el-icon><Folder /></el-icon> 子路径</label>
        <el-input v-model="item.codePath" placeholder="\项目名\webapp" />
      </div>
      <div class="item-row">
        <label><el-icon><Monitor /></el-icon> 测试</label>
        <el-input v-model="item.testEnvUrl" placeholder="http://test.xxx.com" />
        <el-button size="small" @click="openUrl(item.testEnvUrl)" :disabled="!item.testEnvUrl">
          <el-icon><View /></el-icon>
        </el-button>
      </div>
      <div class="item-row">
        <label><el-icon><Monitor /></el-icon> 生产</label>
        <el-input v-model="item.prodEnvUrl" placeholder="http://prod.xxx.com" />
        <el-button size="small" @click="openUrl(item.prodEnvUrl)" :disabled="!item.prodEnvUrl">
          <el-icon><View /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 独立操作按钮 -->
    <div class="item-actions">
      <el-button size="small" type="primary" @click="$emit('action', 1, item)">
        <el-icon><Download /></el-icon> Clone
      </el-button>
      <el-button size="small" type="warning" @click="$emit('action', 2, item)">
        <el-icon><Delete /></el-icon> 清除
      </el-button>
      <el-button size="small" type="success" @click="$emit('action', 3, item)">
        <el-icon><Edit /></el-icon> IDE
      </el-button>
      <el-button size="small" type="info" @click="$emit('action', 4, item)">
        <el-icon><VideoPlay /></el-icon> 启动
      </el-button>
      <el-button size="small" type="danger" @click="$emit('action', 5, item)">
        <el-icon><Lightning /></el-icon> 一键
      </el-button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  item: { type: Object, required: true },
  idePath: { type: String, default: '' }
})

defineEmits(['delete', 'action'])

function openGitUrl() {
  if (props.item.gitUrl) window.electronAPI.openExternal(props.item.gitUrl)
}

function openUrl(url) {
  if (url) window.electronAPI.openExternal(url)
}

function selectSavePath() {
  window.electronAPI.selectFolder().then(path => {
    if (path) props.item.savePath = path
  })
}
</script>

<style lang="scss" scoped>
.config-item {
  background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;
  transition: all 0.2s;
  &:hover { border-color: rgba(102,126,234,0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
}

.item-header {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05);
  .item-index { 
    width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;
  }
  .item-title { flex: 1; display: flex; gap: 12px; }
}

.item-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

.item-row {
  display: flex; align-items: center; gap: 12px;
  label { 
    width: 70px; color: #a1a1aa; font-size: 13px; flex-shrink: 0; display: flex; align-items: center; gap: 6px;
  }
}

:deep(.el-input__wrapper) {
  cursor: text;
}
:deep(.el-input__inner) {
  color: #e4e4e7;
  &::placeholder { color: #a1a1aa; }
}

.item-actions {
  display: flex; gap: 8px; padding: 12px 16px;
  background: rgba(0,0,0,0.1); border-top: 1px solid rgba(255,255,255,0.05);
  flex-wrap: wrap;
}
</style>
