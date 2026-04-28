<template>
  <div class="personal-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">个人中心</h1>
        <div class="header-right">
          <button @click="goNewArticle" class="btn-new">写文章</button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="personal-main">
      <!-- 用户信息 -->
      <div class="user-section">
        <div class="user-avatar">
          <img v-if="userInfo?.head_img" :src="getCoverUrl(userInfo.head_img)" />
          <div v-else class="avatar-placeholder">{{ userInfo?.nickname?.charAt(0) || '?' }}</div>
        </div>
        <div class="user-info">
          <h2>{{ userInfo?.nickname || '未设置昵称' }}</h2>
          <p class="username">@{{ blogStore.userInfo?.username || '' }}</p>
        </div>
        <button @click="showEditUser = true" class="btn-edit-user">编辑资料</button>
      </div>

      <!-- 文章管理 -->
      <div class="articles-section">
        <div class="section-header">
          <h3>我的文章</h3>
          <div class="search-box">
            <input v-model="searchText" placeholder="搜索文章..." @keyup.enter="loadMyArticles" />
            <button @click="loadMyArticles">搜索</button>
          </div>
        </div>

        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="myArticles.length === 0" class="empty">暂无文章</div>
        <div v-else class="article-list">
          <div class="article-item" v-for="article in myArticles" :key="article.id">
            <div class="article-info">
              <h4 @click="goDetail(article.id)">{{ article.title }}</h4>
              <span class="time">{{ article.create_time }}</span>
            </div>
            <div class="article-actions">
              <button @click="goEdit(article.id)" class="btn-edit">编辑</button>
              <button @click="handleDelete(article.id)" class="btn-delete">删除</button>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination" v-if="total > pageSize">
          <button :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</button>
          <span>{{ currentPage }} / {{ Math.ceil(total / pageSize) }}</span>
          <button :disabled="currentPage >= Math.ceil(total / pageSize)" @click="changePage(currentPage + 1)">下一页</button>
        </div>
      </div>

      <!-- 博客服务器状态 -->
      <div class="server-section">
        <h3>博客服务器</h3>
        <div class="server-status">
          <div class="status-item">
            <span class="label">状态：</span>
            <span :class="['value', serverStatus.running ? 'running' : 'stopped']">
              {{ serverStatus.running ? '运行中' : '已停止' }}
            </span>
          </div>
          <div class="status-item" v-if="serverStatus.running">
            <span class="label">地址：</span>
            <span class="value">{{ serverStatus.url }}</span>
          </div>
          <div class="status-item">
            <span class="label">端口：</span>
            <span class="value">{{ serverStatus.port || '未启动' }}</span>
          </div>
        </div>
        <div class="server-actions">
          <button v-if="!serverStatus.running" @click="startServer" :disabled="serverLoading">
            {{ serverLoading ? '启动中...' : '启动服务器' }}
          </button>
          <button v-else @click="stopServer" :disabled="serverLoading" class="btn-stop">
            {{ serverLoading ? '停止中...' : '停止服务器' }}
          </button>
          <button @click="testDb" :disabled="serverLoading" class="btn-test">
            测试数据库连接
          </button>
        </div>
      </div>
    </main>

    <!-- 编辑用户信息弹窗 -->
    <div v-if="showEditUser" class="modal-overlay" @click.self="showEditUser = false">
      <div class="modal">
        <h3>编辑个人资料</h3>
        <form @submit.prevent="saveUserInfo">
          <div class="form-group">
            <label>昵称</label>
            <input v-model="editForm.nickname" type="text" required />
          </div>
          <div class="form-group">
            <label>头像URL</label>
            <input v-model="editForm.head_img" type="text" placeholder="可选" />
          </div>
          <div class="form-actions">
            <button type="button" @click="showEditUser = false" class="btn-cancel">取消</button>
            <button type="submit" class="btn-save">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '../../stores/blog'

const router = useRouter()
const blogStore = useBlogStore()

const loading = ref(false)
const serverLoading = ref(false)
const showEditUser = ref(false)
const searchText = ref('')
const myArticles = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const userInfo = computed(() => blogStore.userInfo)
const serverStatus = computed(() => blogStore.serverStatus)

const editForm = reactive({
  nickname: '',
  head_img: '',
})

// 获取封面URL
function getCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return blogStore.getBaseUrl() + url
}

// 加载我的文章
async function loadMyArticles() {
  loading.value = true
  try {
    const result = await blogStore.getMyArticles(currentPage.value, pageSize.value, searchText.value)
    if (result.code === 0) {
      myArticles.value = result.data.list
      total.value = result.data.total
    }
  } catch (error) {
    window.__toast?.('加载文章失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 切换页码
function changePage(page) {
  currentPage.value = page
  loadMyArticles()
}

// 删除文章
async function handleDelete(articleId) {
  if (!confirm('确定要删除这篇文章吗？')) return

  try {
    const result = await blogStore.deleteArticle(articleId)
    if (result.code === 0) {
      window.__toast?.('删除成功', 'success')
      await loadMyArticles()
    } else {
      window.__toast?.(result.msg, 'error')
    }
  } catch (error) {
    window.__toast?.('删除失败: ' + error.message, 'error')
  }
}

// 保存用户信息
async function saveUserInfo() {
  try {
    const result = await blogStore.updateUserInfo(editForm.nickname, editForm.head_img)
    if (result.code === 0) {
      window.__toast?.('更新成功', 'success')
      showEditUser.value = false
      await blogStore.getUserInfo()
    } else {
      window.__toast?.(result.msg, 'error')
    }
  } catch (error) {
    window.__toast?.('更新失败: ' + error.message, 'error')
  }
}

// 启动服务器
async function startServer() {
  serverLoading.value = true
  try {
    const result = await blogStore.startServer(3001)
    if (result.success) {
      window.__toast?.('服务器启动成功', 'success')
    } else {
      window.__toast?.(result.message, 'error')
    }
  } catch (error) {
    window.__toast?.('启动失败: ' + error.message, 'error')
  } finally {
    serverLoading.value = false
  }
}

// 停止服务器
async function stopServer() {
  serverLoading.value = true
  try {
    const result = await blogStore.stopServer()
    if (result.success) {
      window.__toast?.('服务器已停止', 'success')
    } else {
      window.__toast?.(result.message, 'error')
    }
  } catch (error) {
    window.__toast?.('停止失败: ' + error.message, 'error')
  } finally {
    serverLoading.value = false
  }
}

// 测试数据库
async function testDb() {
  serverLoading.value = true
  try {
    const result = await blogStore.testDatabase()
    if (result.success) {
      window.__toast?.('数据库连接成功', 'success')
    } else {
      window.__toast?.('数据库连接失败: ' + result.message, 'error')
    }
  } catch (error) {
    window.__toast?.('测试失败: ' + error.message, 'error')
  } finally {
    serverLoading.value = false
  }
}

// 导航
function goBack() {
  router.push('/blog')
}

function goNewArticle() {
  router.push('/blog/edit/new')
}

function goDetail(id) {
  router.push(`/blog/article/${id}`)
}

function goEdit(id) {
  router.push(`/blog/edit/${id}`)
}

onMounted(async () => {
  // 检查登录状态
  if (!blogStore.isLoggedIn) {
    router.push('/blog/login')
    return
  }

  // 更新服务器状态
  await blogStore.updateServerStatus()

  // 加载用户信息
  await blogStore.getUserInfo()

  // 初始化编辑表单
  if (userInfo.value) {
    editForm.nickname = userInfo.value.nickname || ''
    editForm.head_img = userInfo.value.head_img || ''
  }

  // 加载文章
  await loadMyArticles()
})
</script>

<style lang="scss" scoped>
.personal-page {
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
  position: sticky;
  top: 0;
  z-index: 100;

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

  .header-right {
    margin-left: auto;
  }

  .btn-new {
    background: #238636;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    color: #fff;
    cursor: pointer;

    &:hover {
      background: #2ea043;
    }
  }
}

.personal-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  margin-bottom: 30px;
}

.user-avatar {
  flex-shrink: 0;

  img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #1f6feb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 600;
  }
}

.user-info {
  flex: 1;

  h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 5px;
  }

  .username {
    color: #8b949e;
    font-size: 14px;
  }
}

.btn-edit-user {
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

.articles-section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 18px;
    font-weight: 600;
  }

  .search-box {
    display: flex;
    gap: 8px;

    input {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 6px 12px;
      color: #e6edf3;
      width: 200px;

      &:focus {
        outline: none;
        border-color: #58a6ff;
      }
    }

    button {
      background: #238636;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      color: #fff;
      cursor: pointer;

      &:hover {
        background: #2ea043;
      }
    }
  }
}

.loading, .empty {
  text-align: center;
  padding: 20px;
  color: #8b949e;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;

  .article-info {
    flex: 1;

    h4 {
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 5px;

      &:hover {
        color: #58a6ff;
      }
    }

    .time {
      color: #8b949e;
      font-size: 12px;
    }
  }

  .article-actions {
    display: flex;
    gap: 8px;

    button {
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }

    .btn-edit {
      background: #1f6feb;
      border: none;
      color: #fff;

      &:hover {
        background: #388bfd;
      }
    }

    .btn-delete {
      background: transparent;
      border: 1px solid #f85149;
      color: #f85149;

      &:hover {
        background: #f8514920;
      }
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;

  button {
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 16px;
    color: #e6edf3;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #30363d;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  span {
    color: #8b949e;
  }
}

.server-section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 15px;
  }
}

.server-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.status-item {
  display: flex;
  gap: 10px;

  .label {
    color: #8b949e;
    min-width: 60px;
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

.server-actions {
  display: flex;
  gap: 10px;

  button {
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  button:not(.btn-stop):not(.btn-test) {
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

  .btn-test {
    background: transparent;
    border: 1px solid #30363d;
    color: #e6edf3;

    &:hover:not(:disabled) {
      background: #21262d;
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 30px;
  width: 100%;
  max-width: 400px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
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
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;

  button {
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid #30363d;
    color: #e6edf3;

    &:hover {
      background: #21262d;
    }
  }

  .btn-save {
    background: #238636;
    border: none;
    color: #fff;

    &:hover {
      background: #2ea043;
    }
  }
}
</style>