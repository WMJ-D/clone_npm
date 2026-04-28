<template>
  <div class="blog-home">
    <!-- 头部导航 -->
    <header class="blog-header">
      <div class="header-content">
        <button @click="goBackHome" class="btn-back-home">← 返回主页</button>
        <h1 class="blog-title" @click="goHome">个人博客</h1>
        <nav class="blog-nav">
          <a @click="goHome" :class="{ active: currentTab === 'home' }">首页</a>
          <a @click="goTimeline" :class="{ active: currentTab === 'timeline' }">时间轴</a>
          <a @click="goAbout" :class="{ active: currentTab === 'about' }">关于</a>
          <a @click="goGuestbook" :class="{ active: currentTab === 'guestbook' }">留言板</a>
        </nav>
        <div class="header-right">
          <div class="search-box">
            <input v-model="searchText" placeholder="搜索文章..." @keyup.enter="handleSearch" />
            <button @click="handleSearch">搜索</button>
          </div>
          <button @click="goSettings" class="btn-settings" title="博客设置">⚙️</button>
          <div v-if="blogStore.isLoggedIn" class="user-info">
            <span class="nickname">{{ blogStore.userInfo?.nickname || '用户' }}</span>
            <button @click="goPersonal" class="btn-personal">个人中心</button>
            <button @click="handleLogout" class="btn-logout">退出</button>
          </div>
          <button v-else @click="goLogin" class="btn-login">登录</button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="blog-main">
      <div class="content-wrapper">
        <!-- 文章列表 -->
        <div class="article-list">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="articles.length === 0" class="empty">暂无文章</div>
          <div v-else class="article-item" v-for="article in articles" :key="article.id" @click="goDetail(article.id)">
            <div class="article-cover" v-if="article.pic_url">
              <img :src="getCoverUrl(article.pic_url)" :alt="article.title" />
            </div>
            <div class="article-info">
              <h2 class="article-title">{{ article.title }}</h2>
              <p class="article-desc">{{ getDesc(article.content) }}</p>
              <div class="article-meta">
                <span class="time">{{ article.create_time }}</span>
                <span class="likes">👍 {{ article.like_count || 0 }}</span>
                <div class="tags">
                  <span v-if="article.class_name01" class="tag">{{ article.class_name01 }}</span>
                  <span v-if="article.class_name02" class="tag">{{ article.class_name02 }}</span>
                  <span v-if="article.class_name03" class="tag">{{ article.class_name03 }}</span>
                </div>
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

        <!-- 侧边栏 -->
        <aside class="blog-sidebar">
          <!-- 分类 -->
          <div class="sidebar-section">
            <h3>文章分类</h3>
            <div class="classify-list">
              <div v-for="item in classifications" :key="item.classify_id" class="classify-item" @click="filterByClassify(item.classname)">
                {{ item.classname }}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- 底部 -->
    <footer class="blog-footer">
      <p>© 2026 个人博客 - 使用 Vue 3 + Electron 构建</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '../../stores/blog'

const router = useRouter()
const blogStore = useBlogStore()

const loading = ref(false)
const searchText = ref('')
const currentTab = ref('home')

const articles = computed(() => blogStore.articles)
const classifications = computed(() => blogStore.classifications)
const currentPage = computed(() => blogStore.pagination.currentPage)
const pageSize = computed(() => blogStore.pagination.pageSize)
const total = computed(() => blogStore.pagination.total)

// 获取封面URL
function getCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return blogStore.getBaseUrl() + url
}

// 获取文章描述
function getDesc(content) {
  if (!content) return ''
  // 移除markdown标记
  const plainText = content.replace(/[#*`\[\]()!>-]/g, '').replace(/\n/g, ' ')
  return plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '')
}

// 加载文章列表
async function loadArticles(page = 1) {
  loading.value = true
  try {
    await blogStore.getArticleList(page, pageSize.value, 0, searchText.value)
    blogStore.pagination.currentPage = page
  } catch (error) {
    console.error('加载文章失败:', error)
    window.__toast?.('加载文章失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 加载分类
async function loadClassifications() {
  try {
    await blogStore.getClassifications()
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 搜索
function handleSearch() {
  loadArticles(1)
}

// 切换页码
function changePage(page) {
  loadArticles(page)
}

// 按分类筛选
function filterByClassify(classname) {
  searchText.value = classname
  loadArticles(1)
}

// 导航方法
function goBackHome() {
  router.push('/')
}

function goHome() {
  currentTab.value = 'home'
  searchText.value = ''
  loadArticles(1)
}

function goTimeline() {
  currentTab.value = 'timeline'
  router.push('/blog/timeline')
}

function goAbout() {
  currentTab.value = 'about'
  router.push('/blog/about')
}

function goGuestbook() {
  currentTab.value = 'guestbook'
  router.push('/blog/guestbook')
}

function goDetail(id) {
  router.push(`/blog/article/${id}`)
}

function goLogin() {
  router.push('/blog/login')
}

function goPersonal() {
  router.push('/blog/personal')
}

function goSettings() {
  router.push('/blog/settings')
}

function handleLogout() {
  blogStore.clearToken()
  window.__toast?.('已退出登录', 'success')
}

onMounted(async () => {
  // 更新服务器状态
  await blogStore.updateServerStatus()

  // 加载数据
  await Promise.all([
    loadArticles(),
    loadClassifications(),
  ])

  // 如果已登录，获取用户信息
  if (blogStore.isLoggedIn) {
    await blogStore.getUserInfo()
  }
})
</script>

<style lang="scss" scoped>
.blog-home {
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: #0d1117;
  color: #e6edf3;
}

.blog-header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    height: 60px;
    gap: 30px;
  }

  .blog-title {
    font-size: 20px;
    font-weight: 600;
    color: #58a6ff;
    cursor: pointer;
    white-space: nowrap;
  }

  .blog-nav {
    display: flex;
    gap: 20px;

    a {
      color: #8b949e;
      cursor: pointer;
      padding: 8px 0;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;

      &:hover, &.active {
        color: #e6edf3;
        border-bottom-color: #58a6ff;
      }
    }
  }

  .header-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 15px;
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

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;

    .nickname {
      color: #e6edf3;
    }

    .btn-personal, .btn-logout {
      background: transparent;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 6px 12px;
      color: #e6edf3;
      cursor: pointer;

      &:hover {
        background: #21262d;
      }
    }

    .btn-logout {
      color: #f85149;
      border-color: #f85149;

      &:hover {
        background: #f8514920;
      }
    }
  }

  .btn-login {
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

  .btn-back-home {
    background: transparent;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 12px;
    color: #e6edf3;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      background: #21262d;
    }
  }

  .btn-settings {
    background: transparent;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 16px;

    &:hover {
      background: #21262d;
    }
  }
}

.blog-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
}

.content-wrapper {
  display: flex;
  gap: 30px;
}

.article-list {
  flex: 1;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #8b949e;
}

.article-item {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #58a6ff;
    transform: translateY(-2px);
  }

  .article-cover {
    margin-bottom: 15px;

    img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 6px;
    }
  }

  .article-title {
    font-size: 18px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 10px;
  }

  .article-desc {
    color: #8b949e;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 15px;
  }

  .article-meta {
    display: flex;
    align-items: center;
    gap: 15px;
    color: #8b949e;
    font-size: 12px;

    .tags {
      display: flex;
      gap: 8px;

      .tag {
        background: #1f6feb30;
        color: #58a6ff;
        padding: 2px 8px;
        border-radius: 4px;
      }
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 30px;

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

.blog-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.sidebar-section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #30363d;
  }
}

.classify-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.classify-item {
  padding: 8px 12px;
  background: #0d1117;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #1f6feb30;
    color: #58a6ff;
  }
}

.blog-footer {
  text-align: center;
  padding: 20px;
  color: #8b949e;
  border-top: 1px solid #30363d;
  margin-top: 40px;
}
</style>