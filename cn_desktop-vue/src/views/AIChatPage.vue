<template>
  <div class="ai-chat-page">
    <header class="ai-page-header">
      <h2>AI 智能助手</h2>
      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/iframe-page')">🌐 系统入口</el-button>
        <el-button @click="$router.push('/')">← 返回配置页</el-button>
      </div>
    </header>

    <h3 class="chat-section-title">国产 AI 平台</h3>
    <div class="ai-grid">
      <div v-for="ai in domesticAIs" :key="ai.name" class="ai-card" @click="openAI(ai.url)">
        <div class="ai-icon">{{ ai.icon }}</div>
        <div class="ai-info">
          <div class="ai-name">{{ ai.name }}</div>
          <div class="ai-desc">{{ ai.desc }}</div>
        </div>
      </div>
    </div>

    <h3 class="chat-section-title">国外 AI 平台</h3>
    <div class="ai-grid">
      <div v-for="ai in foreignAIs" :key="ai.name" class="ai-card" @click="openAI(ai.url)">
        <div class="ai-icon">{{ ai.icon }}</div>
        <div class="ai-info">
          <div class="ai-name">{{ ai.name }}</div>
          <div class="ai-desc">{{ ai.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const domesticAIs = [
  { name: '文心一言', icon: '📚', url: 'https://yiyan.baidu.com', desc: '百度生成式AI产品' },
  { name: '通义千问', icon: '🔮', url: 'https://tongyi.aliyun.com', desc: '阿里云大模型' },
  { name: '智谱清言', icon: '🧠', url: 'https://www.zhipuai.cn', desc: '智谱AI对话助手' },
  { name: '讯飞星火', icon: '✨', url: 'https://xinghuo.xfyun.cn', desc: '科大讯飞认知大模型' },
  { name: '腾讯混元', icon: '🌊', url: 'https://hunyuan.tencent.com', desc: '腾讯混元大模型' },
  { name: 'Kimi', icon: '🌙', url: 'https://kimi.moonshot.cn', desc: '月之暗面AI助手' },
  { name: '豆包', icon: '🫛', url: 'https://www.doubao.com', desc: '字节跳动AI助手' },
  { name: 'DeepSeek', icon: '🔭', url: 'https://chat.deepseek.com', desc: '深度求索大模型' },
]

const foreignAIs = [
  { name: 'ChatGPT', icon: '🤖', url: 'https://chat.openai.com', desc: 'OpenAI GPT系列' },
  { name: 'Claude', icon: '🧩', url: 'https://claude.ai', desc: 'Anthropic AI助手' },
  { name: 'Gemini', icon: '🌟', url: 'https://gemini.google.com', desc: 'Google AI助手' },
  { name: 'Perplexity', icon: '🔍', url: 'https://www.perplexity.ai', desc: 'AI搜索引擎' },
  { name: 'Copilot', icon: '✈️', url: 'https://copilot.microsoft.com', desc: '微软AI助手' },
  { name: 'Mistral', icon: '🌬️', url: 'https://chat.mistral.ai', desc: 'Mistral AI' },
]

function openAI(url) {
  window.electronAPI.openExternal(url)
}
</script>

<style lang="scss" scoped>
.ai-chat-page { min-height: 100vh; background: #1a1a2e; color: #e4e4e7; padding: 20px; }

.ai-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h2 {
    font-size: 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.chat-section-title { font-size: 18px; margin: 24px 0 16px; padding-left: 12px; border-left: 4px solid #667eea; }

.ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

.ai-card {
  display: flex; align-items: center; gap: 16px; padding: 20px;
  background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
  cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #667eea; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(102,126,234,0.2); }
}

.ai-icon { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2)); display: flex; align-items: center; justify-content: center; font-size: 28px; }

.ai-info { flex: 1; }
.ai-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.ai-desc { font-size: 13px; color: #a1a1aa; }
</style>
