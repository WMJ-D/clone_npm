<template>
  <div class="settings-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">博客设置</h1>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="settings-main">
      <!-- 服务器状态 -->
      <div class="settings-section">
        <h2>服务器状态</h2>
        <div class="status-card">
          <div class="status-info">
            <div class="status-item">
              <span class="label">运行状态：</span>
              <span :class="['value', serverStatus.running ? 'running' : 'stopped']">
                {{ serverStatus.running ? '运行中' : '已停止' }}
              </span>
            </div>
            <div class="status-item" v-if="serverStatus.running">
              <span class="label">服务地址：</span>
              <span class="value">{{ serverStatus.url }}</span>
            </div>
            <div class="status-item">
              <span class="label">端口号：</span>
              <span class="value">{{ serverStatus.port || '未启动' }}</span>
            </div>
          </div>
          <div class="status-actions">
            <button v-if="!serverStatus.running" @click="startServer" :disabled="loading" class="btn-start">
              {{ loading ? '启动中...' : '启动服务器' }}
            </button>
            <button v-else @click="stopServer" :disabled="loading" class="btn-stop">
              {{ loading ? '停止中...' : '停止服务器' }}
            </button>
            <button @click="refreshStatus" :disabled="loading" class="btn-refresh">
              刷新状态
            </button>
          </div>
        </div>
      </div>

      <!-- 数据库配置 -->
      <div class="settings-section">
        <h2>数据库配置</h2>
        <div class="config-card">
          <form @submit.prevent="saveDbConfig">
            <div class="form-group">
              <label>主机地址</label>
              <input v-model="dbConfig.host" type="text" placeholder="localhost" />
            </div>
            <div class="form-group">
              <label>端口号</label>
              <input v-model="dbConfig.port" type="text" placeholder="3306" />
            </div>
            <div class="form-group">
              <label>用户名</label>
              <input v-model="dbConfig.user" type="text" placeholder="root" />
            </div>
            <div class="form-group">
              <label>密码</label>
              <input v-model="dbConfig.password" type="password" placeholder="请输入密码" />
            </div>
            <div class="form-group">
              <label>数据库名</label>
              <input v-model="dbConfig.database" type="text" placeholder="mynewblog" />
            </div>
            <div class="form-actions">
              <button type="button" @click="testConnection" :disabled="testing" class="btn-test">
                {{ testing ? '测试中...' : '测试连接' }}
              </button>
              <button type="submit" :disabled="saving" class="btn-save">
                {{ saving ? '保存中...' : '保存配置' }}
              </button>
            </div>
          </form>
          <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
            {{ testResult.message }}
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="settings-section">
        <h2>使用说明</h2>
        <div class="help-card">
          <h3>前置要求</h3>
          <ul>
            <li>需要安装 MySQL 5.7+ 或 MariaDB 10.3+</li>
            <li>MySQL 服务需要正在运行</li>
          </ul>

          <h3>数据库初始化</h3>
          <p>首次使用需要创建数据库和表结构：</p>
          <pre><code>CREATE DATABASE IF NOT EXISTS mynewblog DEFAULT CHARACTER SET utf8mb4;
USE mynewblog;

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  nickname VARCHAR(50),
  head_img VARCHAR(255),
  email VARCHAR(100),
  phone VARCHAR(20)
);

-- 文章表
CREATE TABLE IF NOT EXISTS article (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  user_id INT,
  classify_id01 INT,
  classify_id02 INT,
  classify_id03 INT,
  class_name01 VARCHAR(50),
  class_name02 VARCHAR(50),
  class_name03 VARCHAR(50),
  type INT DEFAULT 0,
  pic_url VARCHAR(255),
  visited INT DEFAULT 0,
  like_count INT DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 评论表
CREATE TABLE IF NOT EXISTS comment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  article_id INT,
  cmcontent TEXT,
  nickname VARCHAR(50),
  head_img VARCHAR(255),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS classify (
  classify_id INT AUTO_INCREMENT PRIMARY KEY,
  classname VARCHAR(50) NOT NULL
);</code></pre>

          <h3>常见问题</h3>
          <ul>
            <li><strong>连接失败：</strong>检查 MySQL 服务是否启动，用户名密码是否正确</li>
            <li><strong>表不存在：</strong>需要先执行上面的 SQL 创建数据库和表</li>
            <li><strong>端口被占用：</strong>服务器会自动尝试下一个端口</li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '../../stores/blog'

const router = useRouter()
const blogStore = useBlogStore()

const loading = ref(false)
const testing = ref(false)
const saving = ref(false)
const testResult = ref(null)

const serverStatus = reactive({
  running: false,
  port: null,
  url: null,
})

const dbConfig = reactive({
  host: 'localhost',
  port: '3306',
  user: 'root',
  password: '123456',
  database: 'mynewblog',
})

// 刷新服务器状态
async function refreshStatus() {
  loading.value = true
  try {
    await blogStore.updateServerStatus()
    Object.assign(serverStatus, blogStore.serverStatus)
  } catch (error) {
    window.__toast?.('获取状态失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 启动服务器
async function startServer() {
  loading.value = true
  try {
    const result = await blogStore.startServer(3001)
    if (result.success) {
      window.__toast?.('服务器启动成功', 'success')
      await refreshStatus()
    } else {
      window.__toast?.(result.message, 'error')
    }
  } catch (error) {
    window.__toast?.('启动失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 停止服务器
async function stopServer() {
  loading.value = true
  try {
    const result = await blogStore.stopServer()
    if (result.success) {
      window.__toast?.('服务器已停止', 'success')
      await refreshStatus()
    } else {
      window.__toast?.(result.message, 'error')
    }
  } catch (error) {
    window.__toast?.('停止失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 测试数据库连接
async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    // 先更新配置
    await blogStore.updateDbConfig(dbConfig)
    // 再测试连接
    const result = await blogStore.testDatabase()
    testResult.value = result
    if (result.success) {
      window.__toast?.('数据库连接成功', 'success')
    }
  } catch (error) {
    testResult.value = { success: false, message: error.message }
  } finally {
    testing.value = false
  }
}

// 保存数据库配置
async function saveDbConfig() {
  saving.value = true
  try {
    const result = await blogStore.updateDbConfig(dbConfig)
    if (result.success) {
      window.__toast?.('配置已保存', 'success')
    } else {
      window.__toast?.(result.message, 'error')
    }
  } catch (error) {
    window.__toast?.('保存失败: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/blog')
}

onMounted(async () => {
  await refreshStatus()
})
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: #0d1117;
  color: #e6edf3;
}

.page-header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 20px;

  .header-content {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    height: 60px;
    gap: 20px;
  }

  .btn-back {
    background: transparent;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 16px;
    color: #e6edf3;
    cursor: pointer;

    &:hover {
      background: #21262d;
    }
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }
}

.settings-main {
  max-width: 900px;
  height: calc(100vh - 70px);
  overflow: auto;
  margin: 0 auto;
  padding: 30px 20px;
}

.settings-section {
  margin-bottom: 30px;

  h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #30363d;
  }
}

.status-card, .config-card, .help-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
}

.status-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-item {
  display: flex;
  gap: 10px;

  .label {
    color: #8b949e;
    min-width: 80px;
  }

  .value {
    color: #e6edf3;

    &.running {
      color: #3fb950;
    }

    &.stopped {
      color: #f85149;
    }
  }
}

.status-actions {
  display: flex;
  gap: 10px;
}

.btn-start, .btn-stop, .btn-refresh, .btn-test, .btn-save {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-start {
  background: #238636;
  border: none;
  color: #fff;

  &:hover:not(:disabled) {
    background: #2ea043;
  }
}

.btn-stop {
  background: #f85149;
  border: none;
  color: #fff;

  &:hover:not(:disabled) {
    background: #da3633;
  }
}

.btn-refresh, .btn-test {
  background: transparent;
  border: 1px solid #30363d;
  color: #e6edf3;

  &:hover:not(:disabled) {
    background: #21262d;
  }
}

.btn-save {
  background: #238636;
  border: none;
  color: #fff;

  &:hover:not(:disabled) {
    background: #2ea043;
  }
}

.form-group {
  margin-bottom: 15px;

  label {
    display: block;
    font-size: 14px;
    color: #e6edf3;
    margin-bottom: 5px;
  }

  input {
    width: 100%;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 10px 12px;
    color: #e6edf3;

    &:focus {
      outline: none;
      border-color: #58a6ff;
    }

    &::placeholder {
      color: #484f58;
    }
  }
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.test-result {
  margin-top: 15px;
  padding: 12px;
  border-radius: 6px;

  &.success {
    background: #23863620;
    border: 1px solid #238636;
    color: #3fb950;
  }

  &.error {
    background: #f8514920;
    border: 1px solid #f85149;
    color: #f85149;
  }
}

.help-card {
  h3 {
    font-size: 16px;
    font-weight: 600;
    margin-top: 20px;
    margin-bottom: 10px;
    color: #58a6ff;

    &:first-child {
      margin-top: 0;
    }
  }

  ul {
    padding-left: 20px;
    margin-bottom: 15px;

    li {
      margin-bottom: 5px;
      color: #8b949e;
    }
  }

  p {
    color: #8b949e;
    margin-bottom: 10px;
  }

  pre {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 15px;
    overflow-x: auto;
    margin-bottom: 15px;

    code {
      color: #e6edf3;
      font-size: 13px;
      line-height: 1.5;
    }
  }

  strong {
    color: #e6edf3;
  }
}
</style>