<template>
  <div class="about-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">关于</h1>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="about-main">
      <div class="about-content">
        <div class="about-avatar">
          <div class="avatar-placeholder">B</div>
        </div>
        <h1>个人博客</h1>
        <p class="about-desc">一个基于 Vue 3 + Electron 构建的个人博客系统</p>

        <div class="about-features">
          <h2>功能特性</h2>
          <ul>
            <li>📝 Markdown 文章编辑</li>
            <li>🖼️ 图片上传</li>
            <li>💬 评论系统</li>
            <li>👍 点赞功能</li>
            <li>🔍 文章搜索</li>
            <li>📂 分类管理</li>
            <li>⏰ 时间轴展示</li>
          </ul>
        </div>

        <div class="about-tech">
          <h2>技术栈</h2>
          <div class="tech-list">
            <span class="tech-item">Vue 3</span>
            <span class="tech-item">Electron</span>
            <span class="tech-item">Express</span>
            <span class="tech-item">MySQL</span>
            <span class="tech-item">Pinia</span>
            <span class="tech-item">Element Plus</span>
          </div>
        </div>

        <div class="about-contact">
          <h2>联系方式</h2>
          <p>如有问题或建议，欢迎联系我</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.push('/blog')
}
</script>

<style lang="scss" scoped>
.about-page {
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

.about-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.about-content {
  text-align: center;
}

.about-avatar {
  margin-bottom: 20px;

  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 700;
    margin: 0 auto;
  }
}

h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
}

.about-desc {
  color: #8b949e;
  font-size: 16px;
  margin-bottom: 40px;
}

.about-features, .about-tech, .about-contact {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
  text-align: left;

  h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #30363d;
  }
}

.about-features {
  ul {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  li {
    padding: 8px 12px;
    background: #0d1117;
    border-radius: 6px;
  }
}

.tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tech-item {
  background: #1f6feb30;
  color: #58a6ff;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
}

.about-contact {
  p {
    color: #8b949e;
  }
}
</style>