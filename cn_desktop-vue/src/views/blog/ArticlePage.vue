<template>
  <div class="article-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">文章详情</h1>
        <div class="header-right">
          <button v-if="blogStore.isLoggedIn" @click="goEdit" class="btn-edit">编辑</button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="article-main">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!article" class="empty">文章不存在</div>
      <div v-else class="article-content">
        <!-- 文章头部 -->
        <div class="article-header">
          <h1 class="article-title">{{ article.title }}</h1>
          <div class="article-meta">
            <span class="time">发布时间：{{ article.create_time }}</span>
            <span class="views">阅读：{{ article.visited || 0 }}</span>
            <span class="likes">点赞：{{ article.like_count || 0 }}</span>
          </div>
          <div class="article-tags">
            <span v-if="article.class_name01" class="tag">{{ article.class_name01 }}</span>
            <span v-if="article.class_name02" class="tag">{{ article.class_name02 }}</span>
            <span v-if="article.class_name03" class="tag">{{ article.class_name03 }}</span>
          </div>
        </div>

        <!-- 文章封面 -->
        <div v-if="article.pic_url" class="article-cover">
          <img :src="getCoverUrl(article.pic_url)" :alt="article.title" />
        </div>

        <!-- 文章正文 -->
        <div class="article-body markdown-body" v-html="renderedContent"></div>

        <!-- 点赞按钮 -->
        <div class="article-actions">
          <button @click="handleLike" class="btn-like" :disabled="liking">
            👍 点赞 ({{ article.like_count || 0 }})
          </button>
        </div>

        <!-- 评论区 -->
        <div class="comment-section">
          <h3>评论 ({{ comments.length }})</h3>

          <!-- 发表评论 -->
          <div v-if="blogStore.isLoggedIn" class="comment-form">
            <textarea v-model="commentContent" placeholder="写下你的评论..." rows="3"></textarea>
            <button @click="submitComment" :disabled="!commentContent.trim() || submitting">
              {{ submitting ? '发表中...' : '发表评论' }}
            </button>
          </div>
          <div v-else class="login-tip">
            <p>请 <a @click="goLogin">登录</a> 后发表评论</p>
          </div>

          <!-- 评论列表 -->
          <div class="comment-list">
            <div v-if="comments.length === 0" class="empty-comments">暂无评论</div>
            <div v-else class="comment-item" v-for="comment in comments" :key="comment.id">
              <div class="comment-avatar">
                <img v-if="comment.head_img" :src="getCoverUrl(comment.head_img)" />
                <div v-else class="avatar-placeholder">{{ comment.nickname?.charAt(0) || '?' }}</div>
              </div>
              <div class="comment-body">
                <div class="comment-header">
                  <span class="nickname">{{ comment.nickname }}</span>
                  <span class="time">{{ comment.create_time }}</span>
                </div>
                <div class="comment-content">{{ comment.cmcontent }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlogStore } from '../../stores/blog'
import { marked } from 'marked'

const router = useRouter()
const route = useRoute()
const blogStore = useBlogStore()

const loading = ref(false)
const article = ref(null)
const comments = ref([])
const commentContent = ref('')
const liking = ref(false)
const submitting = ref(false)

const articleId = computed(() => route.params.id)

// 渲染markdown
const renderedContent = computed(() => {
  if (!article.value?.content) return ''
  return marked(article.value.content)
})

// 获取封面URL
function getCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return blogStore.getBaseUrl() + url
}

// 加载文章详情
async function loadArticle() {
  loading.value = true
  try {
    const result = await blogStore.getArticleDetail(articleId.value)
    if (result.code === 0) {
      article.value = result.data
    } else {
      window.__toast?.('文章不存在', 'error')
    }
  } catch (error) {
    window.__toast?.('加载文章失败: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 加载评论
async function loadComments() {
  try {
    const result = await blogStore.getComments(articleId.value)
    if (result.code === 0) {
      comments.value = result.data || []
    }
  } catch (error) {
    console.error('加载评论失败:', error)
  }
}

// 点赞
async function handleLike() {
  if (liking.value) return
  liking.value = true
  try {
    const result = await blogStore.likeArticle(articleId.value)
    if (result.code === 0) {
      article.value.like_count = result.data[0].like_count
      window.__toast?.('点赞成功', 'success')
    }
  } catch (error) {
    window.__toast?.('点赞失败', 'error')
  } finally {
    liking.value = false
  }
}

// 提交评论
async function submitComment() {
  if (!commentContent.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const result = await blogStore.publishComment(articleId.value, commentContent.value)
    if (result.code === 0) {
      window.__toast?.('评论发表成功', 'success')
      commentContent.value = ''
      await loadComments()
    } else {
      window.__toast?.(result.msg, 'error')
    }
  } catch (error) {
    window.__toast?.('评论失败: ' + error.message, 'error')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push('/blog')
}

function goEdit() {
  router.push(`/blog/edit/${articleId.value}`)
}

function goLogin() {
  router.push('/blog/login')
}

onMounted(async () => {
  await Promise.all([
    loadArticle(),
    loadComments(),
  ])
})
</script>

<style lang="scss" scoped>
.article-page {
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

  .btn-edit {
    background: #1f6feb;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    color: #fff;
    cursor: pointer;

    &:hover {
      background: #388bfd;
    }
  }
}

.article-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #8b949e;
}

.article-header {
  margin-bottom: 30px;

  .article-title {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 15px;
    line-height: 1.4;
  }

  .article-meta {
    display: flex;
    gap: 20px;
    color: #8b949e;
    font-size: 14px;
    margin-bottom: 15px;
  }

  .article-tags {
    display: flex;
    gap: 10px;

    .tag {
      background: #1f6feb30;
      color: #58a6ff;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
    }
  }
}

.article-cover {
  margin-bottom: 30px;

  img {
    width: 100%;
    max-height: 400px;
    object-fit: cover;
    border-radius: 8px;
  }
}

.article-body {
  line-height: 1.8;
  font-size: 16px;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }

  :deep(h1) { font-size: 2em; }
  :deep(h2) { font-size: 1.5em; }
  :deep(h3) { font-size: 1.25em; }

  :deep(p) {
    margin-bottom: 16px;
  }

  :deep(code) {
    background: #161b22;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 85%;
  }

  :deep(pre) {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin-bottom: 16px;

    code {
      background: transparent;
      padding: 0;
    }
  }

  :deep(blockquote) {
    border-left: 4px solid #30363d;
    padding: 0 16px;
    color: #8b949e;
    margin-bottom: 16px;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  :deep(a) {
    color: #58a6ff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(ul), :deep(ol) {
    padding-left: 2em;
    margin-bottom: 16px;
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;

    th, td {
      border: 1px solid #30363d;
      padding: 8px 12px;
    }

    th {
      background: #161b22;
    }
  }
}

.article-actions {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #30363d;
  text-align: center;

  .btn-like {
    background: #238636;
    border: none;
    border-radius: 8px;
    padding: 12px 30px;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #2ea043;
      transform: scale(1.05);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.comment-section {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #30363d;

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 20px;
  }
}

.comment-form {
  margin-bottom: 30px;

  textarea {
    width: 100%;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 12px;
    color: #e6edf3;
    font-size: 14px;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: #58a6ff;
    }
  }

  button {
    margin-top: 10px;
    background: #238636;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    color: #fff;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #2ea043;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.login-tip {
  text-align: center;
  padding: 20px;
  color: #8b949e;

  a {
    color: #58a6ff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-comments {
  text-align: center;
  padding: 20px;
  color: #8b949e;
}

.comment-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
}

.comment-avatar {
  flex-shrink: 0;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #1f6feb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }
}

.comment-body {
  flex: 1;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;

  .nickname {
    font-weight: 500;
    color: #e6edf3;
  }

  .time {
    color: #8b949e;
    font-size: 12px;
  }
}

.comment-content {
  color: #e6edf3;
  line-height: 1.6;
}
</style>