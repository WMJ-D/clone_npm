<template>
  <div class="api-tester-page">
    <header class="page-header">
      <div class="header-left">
        <el-button @click="$router.push('/ai-chat')" size="small">← 返回</el-button>
        <h2>🚀 API 接口测试</h2>
      </div>
      <div class="header-right">
        <el-button @click="clearAll" size="small">清空</el-button>
        <el-button @click="exportRequest" size="small">导出</el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 请求区域 -->
      <div class="request-section">
        <div class="url-bar">
          <el-select v-model="method" class="method-select" size="large">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
            <el-option label="PATCH" value="PATCH" />
            <el-option label="HEAD" value="HEAD" />
            <el-option label="OPTIONS" value="OPTIONS" />
          </el-select>
          <el-input v-model="url" placeholder="输入请求 URL，例如: https://api.example.com/users" size="large" class="url-input" @keyup.enter="sendRequest">
            <template #prepend>URL</template>
          </el-input>
          <el-button type="primary" @click="sendRequest" :loading="loading" size="large" class="send-btn">
            发送
          </el-button>
        </div>

        <!-- 请求参数标签页 -->
        <el-tabs v-model="activeTab" class="request-tabs">
          <!-- Headers -->
          <el-tab-pane label="请求头 (Headers)" name="headers">
            <div class="params-editor">
              <div class="params-header">
                <span class="param-col">Key</span>
                <span class="param-col">Value</span>
                <span class="param-col action-col">操作</span>
              </div>
              <div v-for="(header, index) in headers" :key="index" class="param-row">
                <el-input v-model="header.key" placeholder="Header Name" size="small" />
                <el-input v-model="header.value" placeholder="Header Value" size="small" />
                <el-button @click="removeHeader(index)" type="danger" size="small" circle>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button @click="addHeader" type="primary" size="small" plain class="add-btn">
                + 添加请求头
              </el-button>
            </div>
          </el-tab-pane>

          <!-- Params -->
          <el-tab-pane label="查询参数 (Params)" name="params">
            <div class="params-editor">
              <div class="params-header">
                <span class="param-col">Key</span>
                <span class="param-col">Value</span>
                <span class="param-col action-col">操作</span>
              </div>
              <div v-for="(param, index) in queryParams" :key="index" class="param-row">
                <el-input v-model="param.key" placeholder="Parameter Name" size="small" />
                <el-input v-model="param.value" placeholder="Parameter Value" size="small" />
                <el-button @click="removeParam(index)" type="danger" size="small" circle>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-button @click="addParam" type="primary" size="small" plain class="add-btn">
                + 添加参数
              </el-button>
            </div>
          </el-tab-pane>

          <!-- Body -->
          <el-tab-pane label="请求体 (Body)" name="body">
            <div class="body-editor">
              <div class="body-type-select">
                <el-radio-group v-model="bodyType" size="small">
                  <el-radio-button label="none">none</el-radio-button>
                  <el-radio-button label="json">JSON</el-radio-button>
                  <el-radio-button label="form">form-data</el-radio-button>
                  <el-radio-button label="urlencoded">x-www-form-urlencoded</el-radio-button>
                  <el-radio-button label="raw">raw</el-radio-button>
                </el-radio-group>
                <el-button v-if="bodyType === 'json'" @click="formatJson" size="small" type="success" plain>
                  格式化
                </el-button>
              </div>

              <div v-if="bodyType === 'json'" class="body-content">
                <el-input v-model="jsonBody" type="textarea" :rows="10" placeholder='{"key": "value"}' class="json-input" />
              </div>

              <div v-else-if="bodyType === 'form'" class="body-content">
                <div class="params-editor">
                  <div class="params-header">
                    <span class="param-col">Key</span>
                    <span class="param-col">Value</span>
                    <span class="param-col action-col">操作</span>
                  </div>
                  <div v-for="(item, index) in formData" :key="index" class="param-row">
                    <el-input v-model="item.key" placeholder="Field Name" size="small" />
                    <el-input v-model="item.value" placeholder="Field Value" size="small" />
                    <el-button @click="removeFormData(index)" type="danger" size="small" circle>
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <el-button @click="addFormData" type="primary" size="small" plain class="add-btn">
                    + 添加字段
                  </el-button>
                </div>
              </div>

              <div v-else-if="bodyType === 'urlencoded'" class="body-content">
                <div class="params-editor">
                  <div class="params-header">
                    <span class="param-col">Key</span>
                    <span class="param-col">Value</span>
                    <span class="param-col action-col">操作</span>
                  </div>
                  <div v-for="(item, index) in urlEncodedData" :key="index" class="param-row">
                    <el-input v-model="item.key" placeholder="Field Name" size="small" />
                    <el-input v-model="item.value" placeholder="Field Value" size="small" />
                    <el-button @click="removeUrlEncoded(index)" type="danger" size="small" circle>
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <el-button @click="addUrlEncoded" type="primary" size="small" plain class="add-btn">
                    + 添加字段
                  </el-button>
                </div>
              </div>

              <div v-else-if="bodyType === 'raw'" class="body-content">
                <el-input v-model="rawBody" type="textarea" :rows="10" placeholder="输入原始请求体内容" />
              </div>

              <div v-else class="body-content empty-body">
                <p>该请求不包含请求体</p>
              </div>
            </div>
          </el-tab-pane>

          <!-- Auth -->
          <el-tab-pane label="认证 (Auth)" name="auth">
            <div class="auth-editor">
              <el-select v-model="authType" size="small" class="auth-select">
                <el-option label="无认证" value="none" />
                <el-option label="Bearer Token" value="bearer" />
                <el-option label="Basic Auth" value="basic" />
                <el-option label="API Key" value="apikey" />
              </el-select>

              <div v-if="authType === 'bearer'" class="auth-content">
                <el-input v-model="bearerToken" placeholder="输入 Bearer Token" size="small" />
              </div>

              <div v-else-if="authType === 'basic'" class="auth-content basic-auth">
                <el-input v-model="basicUsername" placeholder="用户名" size="small" />
                <el-input v-model="basicPassword" placeholder="密码" type="password" size="small" />
              </div>

              <div v-else-if="authType === 'apikey'" class="auth-content apikey-auth">
                <el-input v-model="apiKeyName" placeholder="Key Name (例如: X-API-Key)" size="small" />
                <el-input v-model="apiKeyValue" placeholder="Key Value" size="small" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 响应区域 -->
      <div class="response-section">
        <div class="response-header">
          <h3>响应结果</h3>
          <div v-if="response" class="response-meta">
            <el-tag :type="getStatusType(response.status)" size="small">
              {{ response.status }} {{ response.statusText }}
            </el-tag>
            <span class="response-time">⏱️ {{ response.time }}ms</span>
            <span class="response-size">📦 {{ response.size }}</span>
          </div>
        </div>

        <div v-if="response" class="response-content">
          <el-tabs v-model="responseTab" class="response-tabs">
            <el-tab-pane label="响应体 (Body)" name="body">
              <div class="response-body">
                <div class="body-actions">
                  <el-button @click="copyResponse" size="small" type="primary" plain>复制</el-button>
                  <el-button @click="toggleJsonView" size="small" type="success" plain>
                    {{ jsonView ? '原始' : '格式化' }}
                  </el-button>
                </div>
                <pre v-if="jsonView && isJsonResponse" class="json-view"><code>{{ formattedResponse }}</code></pre>
                <pre v-else class="raw-view">{{ response.data }}</pre>
              </div>
            </el-tab-pane>

            <el-tab-pane label="响应头 (Headers)" name="headers">
              <div class="response-headers">
                <div v-for="(value, key) in response.headers" :key="key" class="header-item">
                  <span class="header-key">{{ key }}:</span>
                  <span class="header-value">{{ value }}</span>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <div v-else-if="error" class="response-error">
          <el-alert :title="error" type="error" show-icon :closable="false" />
        </div>

        <div v-else class="response-empty">
          <div class="empty-content">
            <p>🚀 输入 URL 并点击发送按钮开始测试</p>
            <p>支持 GET、POST、PUT、DELETE 等请求方法</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 请求配置
const method = ref('GET')
const url = ref('')
const activeTab = ref('headers')
const loading = ref(false)

// Headers
const headers = ref([{ key: 'Content-Type', value: 'application/json' }])

// Query Params
const queryParams = ref([{ key: '', value: '' }])

// Body
const bodyType = ref('none')
const jsonBody = ref('')
const rawBody = ref('')
const formData = ref([{ key: '', value: '' }])
const urlEncodedData = ref([{ key: '', value: '' }])

// Auth
const authType = ref('none')
const bearerToken = ref('')
const basicUsername = ref('')
const basicPassword = ref('')
const apiKeyName = ref('')
const apiKeyValue = ref('')

// 响应
const response = ref(null)
const error = ref(null)
const responseTab = ref('body')
const jsonView = ref(true)

// 计算属性
const isJsonResponse = computed(() => {
  if (!response.value?.data) return false
  try {
    JSON.parse(response.value.data)
    return true
  } catch {
    return false
  }
})

const formattedResponse = computed(() => {
  if (!response.value?.data) return ''
  try {
    return JSON.stringify(JSON.parse(response.value.data), null, 2)
  } catch {
    return response.value.data
  }
})

// 方法
function addHeader() {
  headers.value.push({ key: '', value: '' })
}

function removeHeader(index) {
  headers.value.splice(index, 1)
}

function addParam() {
  queryParams.value.push({ key: '', value: '' })
}

function removeParam(index) {
  queryParams.value.splice(index, 1)
}

function addFormData() {
  formData.value.push({ key: '', value: '' })
}

function removeFormData(index) {
  formData.value.splice(index, 1)
}

function addUrlEncoded() {
  urlEncodedData.value.push({ key: '', value: '' })
}

function removeUrlEncoded(index) {
  urlEncodedData.value.splice(index, 1)
}

function formatJson() {
  try {
    const parsed = JSON.parse(jsonBody.value)
    jsonBody.value = JSON.stringify(parsed, null, 2)
    ElMessage.success('JSON 格式化成功')
  } catch (e) {
    ElMessage.error('JSON 格式错误: ' + e.message)
  }
}

function getStatusType(status) {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'warning'
  if (status >= 400) return 'danger'
  return 'info'
}

function buildUrl() {
  let finalUrl = url.value.trim()
  if (!finalUrl) return ''

  // 添加查询参数
  const validParams = queryParams.value.filter(p => p.key.trim())
  if (validParams.length > 0) {
    const searchParams = new URLSearchParams()
    validParams.forEach(p => searchParams.append(p.key.trim(), p.value))
    const separator = finalUrl.includes('?') ? '&' : '?'
    finalUrl += separator + searchParams.toString()
  }

  return finalUrl
}

function buildHeaders() {
  const headerObj = {}

  // 添加自定义 Headers
  headers.value.forEach(h => {
    if (h.key.trim()) {
      headerObj[h.key.trim()] = h.value
    }
  })

  // 添加认证信息
  if (authType.value === 'bearer' && bearerToken.value) {
    headerObj['Authorization'] = `Bearer ${bearerToken.value}`
  } else if (authType.value === 'basic' && basicUsername.value) {
    const encoded = btoa(`${basicUsername.value}:${basicPassword.value}`)
    headerObj['Authorization'] = `Basic ${encoded}`
  } else if (authType.value === 'apikey' && apiKeyName.value && apiKeyValue.value) {
    headerObj[apiKeyName.value] = apiKeyValue.value
  }

  return headerObj
}

function buildBody() {
  if (method.value === 'GET' || method.value === 'HEAD' || bodyType.value === 'none') {
    return null
  }

  if (bodyType.value === 'json') {
    return jsonBody.value
  }

  if (bodyType.value === 'raw') {
    return rawBody.value
  }

  if (bodyType.value === 'form') {
    const formDataObj = new FormData()
    formData.value.forEach(item => {
      if (item.key.trim()) {
        formDataObj.append(item.key.trim(), item.value)
      }
    })
    return formDataObj
  }

  if (bodyType.value === 'urlencoded') {
    const params = new URLSearchParams()
    urlEncodedData.value.forEach(item => {
      if (item.key.trim()) {
        params.append(item.key.trim(), item.value)
      }
    })
    return params.toString()
  }

  return null
}

async function sendRequest() {
  if (!url.value.trim()) {
    ElMessage.warning('请输入请求 URL')
    return
  }

  loading.value = true
  response.value = null
  error.value = null

  const finalUrl = buildUrl()
  const headerObj = buildHeaders()
  const body = buildBody()

  const startTime = Date.now()

  try {
    const fetchOptions = {
      method: method.value,
      headers: headerObj,
    }

    if (body && method.value !== 'GET' && method.value !== 'HEAD') {
      if (bodyType.value === 'form') {
        fetchOptions.body = body
        // 删除 Content-Type，让浏览器自动设置
        delete fetchOptions.headers['Content-Type']
      } else if (bodyType.value === 'urlencoded') {
        fetchOptions.body = body
        fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      } else {
        fetchOptions.body = body
      }
    }

    const res = await fetch(finalUrl, fetchOptions)
    const endTime = Date.now()

    // 获取响应头
    const responseHeaders = {}
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // 获取响应体
    let responseData
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const json = await res.json()
      responseData = JSON.stringify(json)
    } else {
      responseData = await res.text()
    }

    // 计算响应大小
    const size = new Blob([responseData]).size
    const sizeStr = size > 1024 * 1024
      ? (size / 1024 / 1024).toFixed(2) + ' MB'
      : size > 1024
        ? (size / 1024).toFixed(2) + ' KB'
        : size + ' B'

    response.value = {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      data: responseData,
      time: endTime - startTime,
      size: sizeStr
    }

    ElMessage.success(`请求成功: ${res.status} ${res.statusText}`)
  } catch (e) {
    error.value = `请求失败: ${e.message}`
    ElMessage.error('请求失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function clearAll() {
  method.value = 'GET'
  url.value = ''
  headers.value = [{ key: 'Content-Type', value: 'application/json' }]
  queryParams.value = [{ key: '', value: '' }]
  bodyType.value = 'none'
  jsonBody.value = ''
  rawBody.value = ''
  formData.value = [{ key: '', value: '' }]
  urlEncodedData.value = [{ key: '', value: '' }]
  authType.value = 'none'
  bearerToken.value = ''
  basicUsername.value = ''
  basicPassword.value = ''
  apiKeyName.value = ''
  apiKeyValue.value = ''
  response.value = null
  error.value = null
  ElMessage.success('已清空所有内容')
}

function copyResponse() {
  if (response.value?.data) {
    navigator.clipboard.writeText(response.value.data)
    ElMessage.success('已复制到剪贴板')
  }
}

function toggleJsonView() {
  jsonView.value = !jsonView.value
}

function exportRequest() {
  const config = {
    method: method.value,
    url: url.value,
    headers: headers.value.filter(h => h.key.trim()),
    params: queryParams.value.filter(p => p.key.trim()),
    bodyType: bodyType.value,
    body: bodyType.value === 'json' ? jsonBody.value : bodyType.value === 'raw' ? rawBody.value : null,
    formData: bodyType.value === 'form' ? formData.value.filter(f => f.key.trim()) : null,
    urlEncoded: bodyType.value === 'urlencoded' ? urlEncodedData.value.filter(f => f.key.trim()) : null,
    auth: {
      type: authType.value,
      token: bearerToken.value,
      username: basicUsername.value,
      apiKeyName: apiKeyName.value,
      apiKeyValue: apiKeyValue.value
    }
  }

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `api-request-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(downloadUrl)
  ElMessage.success('请求配置已导出')
}
</script>

<style lang="scss" scoped>
.api-tester-page {
  height: 100vh;
  background: #1a1a2e;
  color: #e4e4e7;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #16213e;
  border-bottom: 1px solid rgba(255,255,255,0.1);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    h2 {
      font-size: 20px;
      background: linear-gradient(135deg, #22c55e, #10b981);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  .header-right {
    display: flex;
    gap: 8px;
  }
}

.main-container {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.request-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #16213e;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
}

.url-bar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);

  .method-select {
    width: 120px;
  }

  .url-input {
    flex: 1;
  }

  .send-btn {
    min-width: 80px;
  }
}

.request-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 12px;
    background: rgba(0,0,0,0.2);
  }

  :deep(.el-tabs__item) {
    color: #a1a1aa;
    
    &.is-active {
      color: #22c55e;
    }
    
    &:hover {
      color: #22c55e;
    }
  }
}

.params-editor {
  .params-header {
    display: flex;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin-bottom: 8px;

    .param-col {
      flex: 1;
      font-size: 12px;
      color: #a1a1aa;
    }

    .action-col {
      flex: none;
      width: 40px;
    }
  }

  .param-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;

    .el-input {
      flex: 1;
    }

    .el-button {
      flex: none;
    }
  }

  .add-btn {
    margin-top: 8px;
  }
}

.body-editor {
  .body-type-select {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .body-content {
    min-height: 200px;
  }

  .json-input {
    :deep(.el-textarea__inner) {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  }

  .empty-body {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a1a1aa;
  }
}

.auth-editor {
  .auth-select {
    width: 200px;
    margin-bottom: 16px;
  }

  .auth-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .basic-auth,
  .apikey-auth {
    display: flex;
    gap: 12px;
  }
}

.response-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #16213e;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);

  h3 {
    font-size: 16px;
    color: #a5b4fc;
  }

  .response-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;

    .response-time,
    .response-size {
      color: #a1a1aa;
    }
  }
}

.response-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .response-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    :deep(.el-tabs__content) {
      flex: 1;
      overflow: auto;
      padding: 12px;
    }

    :deep(.el-tabs__header) {
      margin: 0;
      padding: 0 12px;
      background: rgba(0,0,0,0.2);
    }

    :deep(.el-tabs__item) {
      color: #a1a1aa;
      
      &.is-active {
        color: #22c55e;
      }
      
      &:hover {
        color: #22c55e;
      }
    }
  }
}

.response-body {
  .body-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  pre {
    background: #0d1117;
    border-radius: 8px;
    padding: 16px;
    overflow: auto;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.5;
    color: #e4e4e7;
    margin: 0;

    code {
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
}

.response-headers {
  .header-item {
    display: flex;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);

    .header-key {
      color: #a5b4fc;
      font-weight: 500;
      min-width: 200px;
    }

    .header-value {
      color: #a1a1aa;
      word-break: break-all;
    }
  }
}

.response-error {
  padding: 16px;
}

.response-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-content {
    text-align: center;
    color: #a1a1aa;

    p {
      margin: 8px 0;
      font-size: 14px;
    }
  }
}
</style>
