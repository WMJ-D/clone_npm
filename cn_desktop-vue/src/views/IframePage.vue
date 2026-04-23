<template>
  <div class="iframe-page">
    <header class="iframe-header">
      <h2>🌐 系统入口</h2>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="handleAdd">
          <el-icon><Plus /></el-icon> 新增系统
        </el-button>
        <el-button @click="$router.push('/ai-chat')">← 返回AI助手</el-button>
      </div>
    </header>

    <div class="tab-container">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange" type="card">
        <el-tab-pane
          v-for="item in tabs"
          :key="item.id"
          :label="item.name"
          :name="item.id"
        >
          <template #label>
            <span class="tab-label">
              <span style="display: inline-block;margin-right: 20px;">{{ item.name }}</span>
              <el-icon class="tab-icon" @click.stop="handleEdit(item)"><Edit /></el-icon>
              <el-icon class="tab-icon" @click.stop="handleDelete(item.id)"><Delete /></el-icon>
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="iframe-container">
      <iframe
        v-if="currentUrl"
        :src="currentUrl"
        frameborder="0"
        class="system-iframe"
      />
      <div v-else class="iframe-placeholder">
        <p>请选择一个系统</p>
      </div>
    </div>

    <!-- 新增/编辑 Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑系统' : '新增系统'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="80px" ref="formRef">
        <el-form-item label="名称" prop="name" :rules="[{ required: true, message: '请输入名称' }]">
          <el-input v-model="form.name" placeholder="如：禅道" />
        </el-form-item>
        <el-form-item label="地址" prop="url" :rules="[{ required: true, message: '请输入地址' }]">
          <el-input v-model="form.url" placeholder="https://..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const configStore = useConfigStore()

// 默认的 tab 数据
const defaultTabs = [
  { id: '1', name: '禅道', url: 'http://192.168.10.123:81/zentao/my.html' },
  { id: '2', name: 'GitLab', url: 'http://192.168.182.252/GMProjects' },
  { id: '3', name: '知识库', url: 'http://192.168.182.128:8011/login.action?os_destination=%2Fdashboard.action&permissionViolation=true' },
  { id: '4', name: '掘金', url: 'https://juejin.cn/' }
]

// 使用可写的 ref
const tabs = ref([])
const activeTab = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref('')
const form = ref({ name: '', url: '' })
const formRef = ref(null)

const currentUrl = computed(() => {
  const tab = tabs.value.find(t => t.id === activeTab.value)
  return tab?.url || ''
})

function handleTabChange(tabId) {
  activeTab.value = tabId
}

// 新增
function handleAdd() {
  isEdit.value = false
  editingId.value = ''
  form.value = { name: '', url: '' }
  dialogVisible.value = true
}

// 编辑
function handleEdit(item) {
  isEdit.value = true
  editingId.value = item.id
  form.value = { name: item.name, url: item.url }
  dialogVisible.value = true
}

// 删除
async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除该系统吗？', '提示', {
      type: 'warning'
    })
    tabs.value = tabs.value.filter(t => t.id !== id)
    // 如果删除的是当前选中项，切换到第一个
    if (activeTab.value === id) {
      activeTab.value = tabs.value[0]?.id || ''
    }
    await saveTabs()
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

// 保存
async function handleSave() {
  try {
    await formRef.value.validate()

    if (isEdit.value) {
      // 编辑
      const index = tabs.value.findIndex(t => t.id === editingId.value)
      if (index !== -1) {
        tabs.value[index] = { ...form.value, id: editingId.value }
      }
    } else {
      // 新增
      tabs.value.push({
        id: Date.now().toString(),
        name: form.value.name,
        url: form.value.url
      })
    }

    await saveTabs()
    dialogVisible.value = false
    ElMessage.success(isEdit.value ? '修改成功' : '添加成功')
  } catch {
    // 验证失败
  }
}

// 保存到配置
async function saveTabs() {
  configStore.systemTabs = [...tabs.value]
  await configStore.saveConfig()
}

onMounted(() => {
  // 从配置加载，没有则使用默认值
  if (configStore.systemTabs && configStore.systemTabs.length > 0) {
    tabs.value = [...configStore.systemTabs]
  } else {
    tabs.value = [...defaultTabs]
  }

  // 默认选中第一个
  if (tabs.value.length > 0) {
    activeTab.value = tabs.value[0].id
  }
})
</script>

<style lang="scss" scoped>
.iframe-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  color: #e4e4e7;
}

.iframe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #16213e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h2 {
    font-size: 20px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
  }
}

.tab-container {
  background: #16213e;
  padding: 0 20px;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    color: #a1a1aa;
    font-size: 14px;
    height: 40px;
    line-height: 40px;
    padding: 0 12px;

    &.is-active {
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    &:hover {
      color: #667eea;
    }
  }

  :deep(.el-tabs__active-bar) {
    display: none;
  }

  :deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
    border: none;
  }

  :deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
    border-bottom: 2px solid #667eea;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 4px;

  .tab-icon {
    margin-left: 4px;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;
    cursor: pointer;

    &:hover {
      color: #667eea;
    }
  }
}

:deep(.el-tabs__item:hover .tab-icon),
:deep(.el-tabs__item.is-active .tab-icon) {
  opacity: 1;
}

.iframe-container {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.system-iframe {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: #fff;
}

.iframe-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a1a1aa;
  font-size: 16px;
}

// Dialog 样式优化
:deep(.el-dialog) {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;

  .el-dialog__header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 16px 20px;
    margin-right: 0;

    .el-dialog__title {
      color: #e4e4e7;
      font-size: 18px;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 16px;
      right: 16px;

      .el-icon {
        color: #a1a1aa;

        &:hover {
          color: #667eea;
        }
      }
    }
  }

  .el-dialog__body {
    padding: 24px 20px;
    color: #e4e4e7;

    // 表单样式
    .el-form-item {
      margin-bottom: 20px;

      .el-form-item__label {
        color: #a1a1aa;
        font-size: 14px;
      }

      .el-input__wrapper {
        background: #16213e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: none;

        &:hover,
        &.is-focus {
          border-color: #667eea;
        }

        .el-input__inner {
          color: #e4e4e7;

          &::placeholder {
            color: #71717a;
          }
        }
      }
    }
  }

  .el-dialog__footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 16px 20px;

    .el-button {
      border-radius: 8px;
      padding: 10px 20px;

      &--primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        border: none;

        &:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      }
    }
  }
}
</style>
