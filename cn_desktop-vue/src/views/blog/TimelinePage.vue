<template>
  <div class="timeline-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">时间轴</h1>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="timeline-main">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="articles.length === 0" class="empty">暂无文章</div>
      <div v-else class="timeline">
        <div class="timeline-item" v-for="article in articles" :key="article.id" @click="goDetail(article.id)">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-time">{{ article.create_time }}</div>
            <h3 class="timeline-title">{{ article.title }}</h3>
            <p class="timeline-desc">{{ getDesc(article.content) }}</p>
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
const articles = ref([])

function getDesc(content) {
  if (!content) return ''
  const plainText = content.replace(/[#*`\[\]()!>-]/g, '').replace(/\n/g, ' ')
  return plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '')
}

async function loadArticles() {
  loading.value = true
  try {
    const result = await blogStore.getArticleList(1, 100, 0)
    if (result.code === 0) {
      articles.value = result.data
    }
  } catch (error) {
    console.error('加载文章失败:', error)
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/blog')
}

function goDetail(id) {
  router.push(`/blog/article/${id}`)
}

onMounted(() => {
  loadArticles()
})
</script>

<style lang="scss" scoped>
.timeline-page {
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

.timeline-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 20px;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #8b949e;
}

.timeline {
  position: relative;
  padding-left: 30px;

  &::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #30363d;
  }
}

.timeline-item {
  position: relative;
  margin-bottom: 30px;
  cursor: pointer;

  &:hover {
    .timeline-content {
      border-color: #58a6ff;
    }
  }
}

.timeline-dot {
  position: absolute;
  left: -25px;
  top: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #58a6ff;
  border: 2px solid #0d1117;
}

.timeline-content {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
  transition: border-color 0.2s;
}

.timeline-time {
  color: #8b949e;
  font-size: 12px;
  margin-bottom: 8px;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.timeline-desc {
  color: #8b949e;
  font-size: 14px;
  line-height: 1.6;
}
</style>