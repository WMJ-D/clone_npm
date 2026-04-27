<template>
  <div class="ai-models-page">
    <header class="aim-header">
      <h1>AI模型API列表</h1>
      <div class="aim-actions">
        <el-button @click="$router.push('/ai-chat')">AI 智能助手</el-button>
        <el-button @click="$router.push('/')">返回配置</el-button>
      </div>
    </header>

    <!-- API 配置区 -->
    <div class="aim-api-info">
      <div class="aim-api-tabs">
        <div v-for="api in aiStore.apiConfigs" :key="api.id"
             :class="['api-tab', { active: aiStore.currentApiId === api.id }]"
             @click="switchApi(api.id)">
          {{ api.name }}
        </div>
        <el-button size="small" @click="aiStore.addApiConfig()">+ 添加</el-button>
        <el-button size="small" @click="showManagePanel = true">管理</el-button>
      </div>
      <div class="aim-row">
        <label>API URL：</label>
        <el-input v-model="aiStore.currentApi.url" placeholder="https://api.openai.com/v1" />
      </div>
      <div class="aim-row">
        <label>API Key：</label>
        <el-input v-model="aiStore.currentApi.key" placeholder="sk-xxx" type="password" show-password />
        <el-button type="primary" @click="fetchModels" :loading="aiStore.isLoadingModels">查询模型</el-button>
      </div>
    </div>

    <!-- 管理面板 -->
    <el-dialog v-model="showManagePanel" title="API 配置管理" width="600px" class="manage-dialog">
      <div class="manage-list">
        <div v-for="api in aiStore.apiConfigs" :key="api.id" class="manage-item">
          <div class="manage-item-left">
            <el-input v-model="api.name" size="small" placeholder="名称" class="name-input" />
            <el-input v-model="api.url" size="small" placeholder="API 地址" />
          </div>
          <div class="manage-item-right">
            <el-tag v-if="aiStore.currentApiId === api.id" type="success" size="small">使用中</el-tag>
            <el-button type="danger" size="small" plain @click="confirmRemove(api)">删除</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showManagePanel = false">关闭</el-button>
        <el-button type="primary" @click="aiStore.addApiConfig()">+ 添加 API</el-button>
      </template>
    </el-dialog>

    <!-- 模型分类 -->
    <div class="aim-section-title">模型分类</div>
    <div class="aim-tabs">
      <div v-for="cat in aiStore.modelCategories" :key="cat"
           :class="['aim-tab', { active: aiStore.currentCategory === cat }]"
           @click="aiStore.setCategory(cat)">
        {{ cat }} ({{ aiStore.categoryCounts[cat] || 0 }})
      </div>
    </div>
    <div class="aim-stats">共 {{ aiStore.models.length }} 个模型</div>

    <!-- 模型网格 -->
    <div class="aim-content">
      <div v-if="aiStore.models.length === 0" class="aim-placeholder">
        请先配置 API 并点击「查询模型」
      </div>
      <div v-else class="aim-grid">
        <div v-for="model in aiStore.getFilteredModels()" :key="model.id" class="aim-card" @click="copyModelId(model.id)">
          <div class="aim-model-id">{{ model.id }}</div>
          <div v-if="model.created" class="aim-model-created">创建于: {{ new Date(model.created * 1000).toLocaleDateString() }}</div>
        </div>
      </div>
    </div>

    <!-- AI 对话区域 -->
    <div class="aim-chat-section">
      <div class="aim-chat-header">
        <h3>💬 AI 对话</h3>
        <div class="aim-chat-settings">
          <label>模型：</label>
          <el-select v-model="aiStore.currentModel" placeholder="请先查询模型" filterable style="width:280px">
            <el-option v-for="m in aiStore.models" :key="m.id" :label="m.id" :value="m.id" />
          </el-select>
        </div>
      </div>

      <div class="aim-chat-messages" ref="messagesRef">
        <div v-if="aiStore.messages.length === 0" class="aim-chat-welcome">
          输入消息开始对话，支持流式输出
        </div>
        <div v-for="msg in aiStore.messages" :key="msg.id" :class="['aim-chat-msg', msg.role, { isError: msg.isError }]">
          <div class="aim-chat-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="aim-chat-content" v-if="msg.role === 'user'">{{ msg.content }}</div>
          <div class="aim-chat-content markdown-body" v-else v-html="parseMarkdown(msg.content)"></div>
        </div>

      </div>

      <div class="aim-chat-input-area">
        <el-input
          v-model="chatInput"
          type="textarea"
          :rows="2"
          :autosize="{ minRows: 2, maxRows: 8 }"
          placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
          @keydown.enter.exact.prevent="sendMessage"
          :disabled="!aiStore.currentModel"
          style="flex:1"
        />
        <el-button type="primary" @click="sendMessage" :disabled="!aiStore.currentModel || !chatInput.trim()">发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useAIStore } from '@/stores/ai'
import { ElMessageBox } from 'element-plus'
import { marked } from 'marked'

const aiStore = useAIStore()
const chatInput = ref('')
const messagesRef = ref(null)
const showManagePanel = ref(false)

// 配置 marked
marked.setOptions({
  breaks: true, // 支持换行符
  gfm: true,   // 支持 GitHub Flavored Markdown
})

// 解析 markdown 内容
function parseMarkdown(content) {
  if (!content) return ''
  // 如果是错误消息或思考中，直接返回文本
  if (content.startsWith('❌') || content === '思考中...') {
    return content
  }
  try {
    return marked.parse(content)
  } catch (e) {
    return content
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 确认删除 API
function confirmRemove(api) {
  if (aiStore.apiConfigs.length <= 1) {
    window.__toast('至少保留一个 API 配置', 'warning')
    return
  }
  ElMessageBox.confirm(`确定删除 "${api.name}" 吗？`, '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    aiStore.removeApiConfig(api.id)
  }).catch(() => {})
}

// 切换 API 时自动查询模型
async function switchApi(id) {
  aiStore.setCurrentApi(id)
  await fetchModels()
}

// 进入页面时自动查询第一个 API
onMounted(async () => {
  if (aiStore.currentApi.url && aiStore.currentApi.key && aiStore.models.length === 0) {
    await fetchModels()
  }
})

async function fetchModels() {
  if (!aiStore.currentApi.url || !aiStore.currentApi.key) {
    window.__toast('请先填写 API URL 和 Key', 'warning')
    return
  }
  aiStore.isLoadingModels = true
  try {
    const res = await fetch(`${aiStore.currentApi.url}/models`, {
      headers: { 'Authorization': `Bearer ${aiStore.currentApi.key}` }
    })
    const data = await res.json()
    if (data.data) {
      aiStore.setModels(data.data)
      window.__toast(`成功加载 ${data.data.length} 个模型`, 'success')
    } else {
      window.__toast('获取模型失败: ' + (data.error?.message || '未知错误'), 'error')
    }
  } catch (e) {
    window.__toast('请求失败: ' + e.message, 'error')
  } finally {
    aiStore.isLoadingModels = false
  }
}

function copyModelId(id) {
  navigator.clipboard.writeText(id)
  window.__toast('已复制: ' + id)
}

async function sendMessage() {
  if (!chatInput.value.trim() || !aiStore.currentModel) return
  const content = chatInput.value.trim()
  chatInput.value = ''
  aiStore.addMessage('user', content)
  scrollToBottom()

  const messages = aiStore.messages.filter(m => m.role !== 'system').map(({ role, content }) => ({ role, content }))
  aiStore.addMessage('assistant', '思考中...')
  aiStore.isStreaming = true

  try {
    const res = await fetch(`${aiStore.currentApi.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiStore.currentApi.key}`
      },
      body: JSON.stringify({ 
        model: aiStore.currentModel,
        messages,
        stream: true, 
        web_search: true,
       })
    })

    // 检查 HTTP 状态码
    if (!res.ok) {
      let errorMsg = `请求失败 (${res.status})`
      try {
        const errData = await res.json()
        errorMsg = errData.error?.message || errData.message || errData.error?.code || errorMsg
      } catch {}
      const lastMsg = aiStore.messages[aiStore.messages.length - 1]
      lastMsg.content = `❌ ${errorMsg}`
      lastMsg.isError = true
      scrollToBottom()
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            // 检查返回的错误
            if (json.error) {
              const lastMsg = aiStore.messages[aiStore.messages.length - 1]
              lastMsg.content = `❌ ${json.error.message || json.error.code || '未知错误'}`
              lastMsg.isError = true
              scrollToBottom()
              return
            }
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              const lastMsg = aiStore.messages[aiStore.messages.length - 1]
              // 第一次收到内容时，清除"思考中..."
              if (lastMsg.content === '思考中...') {
                lastMsg.content = ''
              }
              lastMsg.content += delta
              scrollToBottom()
            }
          } catch {}
        }
      }
      await nextTick()
    }
  } catch (e) {
    const lastMsg = aiStore.messages[aiStore.messages.length - 1]
    lastMsg.content = `❌ 网络错误: ${e.message}`
    lastMsg.isError = true
    scrollToBottom()
  } finally {
    aiStore.isStreaming = false
  }
}
</script>

<style lang="scss" scoped>
.ai-models-page { height: 100vh; overflow-y: auto; background: #1a1a2e; color: #e4e4e7; padding: 20px; }

.aim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  h1 { font-size: 24px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
}

.aim-api-info { background: #16213e; border-radius: 12px; padding: 16px; margin-bottom: 20px;
  .aim-api-tabs { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .api-tab { padding: 6px 16px; border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.05); transition: all 0.2s;
    &:hover { background: rgba(255,255,255,0.1); } &.active { background: linear-gradient(135deg, #667eea, #764ba2); }
  }
  .aim-row { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; label { width: 70px; color: #a1a1aa; } .el-input { flex: 1; } }
}

// 管理弹窗样式
:deep(.el-dialog.manage-dialog) {
  background: #1a1a2e;
  border-radius: 12px;
  .el-dialog__header { border-bottom: 1px solid rgba(255,255,255,0.1); padding: 16px 20px; }
  .el-dialog__title { color: #e4e4e7; font-size: 16px; }
  .el-dialog__body { padding: 20px; }
  .el-dialog__footer { border-top: 1px solid rgba(255,255,255,0.1); padding: 16px 20px; }
}
:deep(.el-overlay-dialog) {
  background: rgba(0,0,0,0.6);
}

.manage-list { display: flex; flex-direction: column; gap: 12px; }
.manage-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; transition: background 0.2s;
  &:hover { background: rgba(255,255,255,0.06); }
  .manage-item-left { display: flex; flex: 1; gap: 8px; }
  .manage-item-left .name-input { width: 100px; flex-shrink: 0; }
  .manage-item-right { display: flex; align-items: center; gap: 8px; }
}

.aim-section-title { font-size: 14px; color: #a1a1aa; margin-bottom: 12px; }
.aim-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.aim-tab { padding: 6px 14px; border-radius: 20px; cursor: pointer; background: rgba(255,255,255,0.05); font-size: 13px; transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.1); } &.active { background: linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.3)); }
}
.aim-stats { color: #666; font-size: 12px; margin-bottom: 16px; }

.aim-content { max-height: 350px; overflow-y: auto;  padding: 16px 0; }
.aim-placeholder { text-align: center; padding: 40px; color: #666; }
.aim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.aim-card { background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #667eea; transform: translateY(-2px); }
  .aim-model-id { font-size: 13px; word-break: break-all; } .aim-model-created { font-size: 11px; color: #666; margin-top: 8px; }
}

.aim-chat-section { background: #16213e; border-radius: 12px; padding: 16px; margin-top: 20px;
  .aim-chat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    h3 { font-size: 16px; } .aim-chat-settings { display: flex; align-items: center; gap: 8px; label { color: #a1a1aa; } }
  }
}

.aim-chat-messages { max-height: 600px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: rgba(0,0,0,0.2);
  .aim-chat-welcome { text-align: center; color: #666; padding: 40px; }
}

.aim-chat-msg { display: flex; gap: 12px; margin-bottom: 16px;
  &.user { flex-direction: row-reverse; .aim-chat-content { background: rgba(102,126,234,0.3);  } }
  &.isError .aim-chat-content { background: rgba(255,82,82,0.2); border: 1px solid rgba(255,82,82,0.3); color: #ff6b6b; }
  .aim-chat-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .aim-chat-content {display: inline-block; align-items: center;padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.05); white-space: pre-wrap; word-break: break-all; line-height: 1.6; }
}

// Markdown 样式
.markdown-body {
  pre {
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    overflow-x: auto;
    code {
      background: none;
      padding: 0;
      font-size: 13px;
    }
  }
  code {
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 13px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  }
  p { margin: 8px 0; }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  li { margin: 4px 0; }
  h1, h2, h3, h4, h5, h6 { margin: 12px 0 8px; font-weight: 600; }
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; }
  h3 { font-size: 1.1em; }
  blockquote {
    border-left: 3px solid #667eea;
    padding-left: 12px;
    margin: 8px 0;
    color: #a1a1aa;
  }
  table {
    border-collapse: collapse;
    margin: 8px 0;
    th, td {
      border: 1px solid rgba(255,255,255,0.1);
      padding: 8px 12px;
      text-align: left;
    }
    th { background: rgba(0,0,0,0.2); }
  }
  a { color: #667eea; text-decoration: none; &:hover { text-decoration: underline; } }
  img { max-width: 100%; border-radius: 8px; }
  hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0; }
}

.aim-chat-input-area { display: flex; gap: 12px; align-items: flex-end; }
</style>
