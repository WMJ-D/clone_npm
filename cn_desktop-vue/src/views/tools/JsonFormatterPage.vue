<template>
  <div class="json-formatter-page">
    <header class="page-header">
      <h2>JSON 格式化工具</h2>
      <div class="header-actions">
        <el-button @click="$router.push('/ai-chat')">← 返回工具箱</el-button>
      </div>
    </header>

    <div class="formatter-container">
      <div class="input-section">
        <div class="section-header">
          <h3>输入 JSON</h3>
          <div class="action-buttons">
            <el-button size="small" @click="clearInput">清空</el-button>
            <el-button size="small" @click="pasteFromClipboard">粘贴</el-button>
            <el-button size="small" @click="loadSample">示例</el-button>
          </div>
        </div>
        <el-input
          v-model="jsonInput"
          type="textarea"
          :rows="12"
          placeholder="请输入 JSON 字符串..."
          class="json-textarea"
        />
      </div>

      <div class="control-section">
        <el-button type="primary" @click="formatJson" :disabled="!jsonInput.trim()">
          格式化
        </el-button>
        <el-button @click="compressJson" :disabled="!jsonInput.trim()">
          压缩
        </el-button>
        <el-button @click="validateJson" :disabled="!jsonInput.trim()">
          验证
        </el-button>
        <el-button @click="swapContent" :disabled="!jsonOutput">
          交换
        </el-button>
      </div>

      <div class="output-section">
        <div class="section-header">
          <h3>输出结果</h3>
          <div class="action-buttons">
            <el-button size="small" @click="copyOutput" :disabled="!jsonOutput">复制</el-button>
            <el-button size="small" @click="downloadOutput" :disabled="!jsonOutput">下载</el-button>
          </div>
        </div>
        <el-input
          v-model="jsonOutput"
          type="textarea"
          :rows="12"
          readonly
          placeholder="格式化结果将显示在这里..."
          class="json-textarea output"
        />
      </div>

      <div v-if="errorMessage" class="error-message">
        <el-alert :title="errorMessage" type="error" show-icon :closable="false" />
      </div>

      <div v-if="successMessage" class="success-message">
        <el-alert :title="successMessage" type="success" show-icon :closable="false" />
      </div>

      <div class="stats-section" v-if="jsonOutput">
        <div class="stat-item">
          <span class="stat-label">字符数:</span>
          <span class="stat-value">{{ jsonOutput.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">行数:</span>
          <span class="stat-value">{{ jsonOutput.split('\n').length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">大小:</span>
          <span class="stat-value">{{ formatSize(jsonOutput.length) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const jsonInput = ref('')
const jsonOutput = ref('')
const errorMessage = ref('')
const successMessage = ref('')

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function formatJson() {
  clearMessages()
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonOutput.value = JSON.stringify(parsed, null, 2)
    successMessage.value = 'JSON 格式化成功！'
  } catch (e) {
    errorMessage.value = `JSON 解析错误: ${e.message}`
    jsonOutput.value = ''
  }
}

function compressJson() {
  clearMessages()
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonOutput.value = JSON.stringify(parsed)
    successMessage.value = 'JSON 压缩成功！'
  } catch (e) {
    errorMessage.value = `JSON 解析错误: ${e.message}`
    jsonOutput.value = ''
  }
}

function validateJson() {
  clearMessages()
  try {
    JSON.parse(jsonInput.value)
    successMessage.value = 'JSON 格式正确！'
  } catch (e) {
    errorMessage.value = `JSON 格式错误: ${e.message}`
  }
}

function swapContent() {
  if (jsonOutput.value) {
    jsonInput.value = jsonOutput.value
    jsonOutput.value = ''
    clearMessages()
  }
}

function clearInput() {
  jsonInput.value = ''
  jsonOutput.value = ''
  clearMessages()
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    jsonInput.value = text
    clearMessages()
  } catch (e) {
    errorMessage.value = '无法访问剪贴板'
  }
}

function copyOutput() {
  if (jsonOutput.value) {
    navigator.clipboard.writeText(jsonOutput.value)
    successMessage.value = '已复制到剪贴板！'
  }
}

function downloadOutput() {
  if (!jsonOutput.value) return
  
  const blob = new Blob([jsonOutput.value], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = 'formatted.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(downloadUrl)
  successMessage.value = '文件下载成功！'
}

function loadSample() {
  jsonInput.value = JSON.stringify({
    name: "JSON 格式化工具",
    version: "1.0.0",
    features: ["格式化", "压缩", "验证", "复制", "下载"],
    config: {
      theme: "dark",
      language: "zh-CN",
      autoFormat: true
    },
    users: [
      { id: 1, name: "用户1", active: true },
      { id: 2, name: "用户2", active: false }
    ]
  }, null, 2)
  clearMessages()
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
</script>

<style lang="scss" scoped>
.json-formatter-page {
  height: 100vh;
  overflow-y: auto;
  background: #1a1a2e;
  color: #e4e4e7;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.formatter-container {
  max-width: 1200px;
  margin: 0 auto;
}

.input-section,
.output-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    font-size: 16px;
    color: #e4e4e7;
    margin: 0;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }
}

.json-textarea {
  :deep(.el-textarea__inner) {
    background: #16213e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e4e4e7;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 8px;
    padding: 16px;

    &:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }

    &::placeholder {
      color: #666;
    }
  }

  &.output :deep(.el-textarea__inner) {
    background: #0f172a;
    border-color: rgba(34, 197, 94, 0.3);
  }
}

.control-section {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 24px 0;
  padding: 16px;
  background: #16213e;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.error-message,
.success-message {
  margin: 16px 0;
}

.stats-section {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 16px;
  background: #16213e;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #a1a1aa;
  font-size: 14px;
}

.stat-value {
  color: #667eea;
  font-weight: 600;
  font-size: 14px;
}
</style>
