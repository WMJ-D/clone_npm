<template>
  <div class="guestbook-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">留言板</h1>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="guestbook-main">
      <div class="guestbook-content">
        <div class="guestbook-intro">
          <h2>欢迎留言</h2>
          <p>在这里留下你的想法、建议或问题</p>
        </div>

        <!-- 留言表单 -->
        <div v-if="blogStore.isLoggedIn" class="message-form">
          <textarea v-model="messageContent" placeholder="写下你的留言..." rows="4"></textarea>
          <button @click="submitMessage" :disabled="!messageContent.trim() || submitting">
            {{ submitting ? '发表中...' : '发表留言' }}
          </button>
        </div>
        <div v-else class="login-tip">
          <p>请 <a @click="goLogin">登录</a> 后发表留言</p>
        </div>

        <!-- 留言列表 -->
        <div class="message-list">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="messages.length === 0" class="empty">暂无留言</div>
          <div v-else class="message-item" v-for="msg in messages" :key="msg.id">
            <div class="message-avatar">
              <img v-if="msg.head_img" :src="getCoverUrl(msg.head_img)" />
              <div v-else class="avatar-placeholder">{{ msg.nickname?.charAt(0) || '?' }}</div>
            </div>
            <div class="message-body">
              <div class="message-header">
                <span class="nickname">{{ msg.nickname }}</span>
                <span class="time">{{ msg.create_time }}</span>
              </div>
              <div class="message-content">{{ msg.cmcontent }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '../../stores/blog'

const router = useRouter()
const blogStore = useBlogStore()

const loading = ref(false)
const submitting = ref(false)
const messageContent = ref('')
const messages = ref([])

function getCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return blogStore.getBaseUrl() + url
}

// 加载留言（使用文章ID=0作为留言板）
async function loadMessages() {
  loading.value = true
  try {
    // 这里假设使用一个特殊的文章ID作为留言板
    // 实际可能需要单独的留言板接口
    const result = await blogStore.getComments(0)
    if (result.code === 0) {
      messages.value = result.data || []
    }
  } catch (error) {
    console.error('加载留言失败:', error)
  } finally {
    loading.value = false
  }
}

// 提交留言
async function submitMessage() {
  if (!messageContent.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const result = await blogStore.publishComment(0, messageContent.value)
    if (result.code === 0) {
      window.__toast?.('留言发表成功', 'success')
      messageContent.value = ''
      await loadMessages()
    } else {
      window.__toast?.(result.msg, 'error')
    }
  } catch (error) {
    window.__toast?.('留言失败: ' + error.message, 'error')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push('/blog')
}

function goLogin() {
  router.push('/blog/login')
}

onMounted(() => {
  loadMessages()
})
</script>

<style lang="scss" scoped>
.guestbook-page {
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
    max-width: 800px;
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

.guestbook-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 20px;
}

.guestbook-intro {
  text-align: center;
  margin-bottom: 30px;

  h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 10px;
  }

  p {
    color: #8b949e;
  }
}

.message-form {
  margin-bottom: 30px;

  textarea {
    width: 100%;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 16px;
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
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  margin-bottom: 30px;

  a {
    color: #58a6ff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

.loading, .empty {
  text-align: center;
  padding: 30px;
  color: #8b949e;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message-item {
  display: flex;
  gap: 15px;
  padding: 20px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
}

.message-avatar {
  flex-shrink: 0;

  img {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: #1f6feb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }
}

.message-body {
  flex: 1;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;

  .nickname {
    font-weight: 500;
    color: #e6edf3;
  }

  .time {
    color: #8b949e;
    font-size: 12px;
  }
}

.message-content {
  color: #e6edf3;
  line-height: 1.6;
}
</style>