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

    <h3 class="chat-section-title">小游戏</h3>
    <div class="ai-grid">
      <div v-for="game in games" :key="game.name" class="ai-card game-card" @click="$router.push(game.route)">
        <div class="ai-icon">{{ game.icon }}</div>
        <div class="ai-info">
          <div class="ai-name">{{ game.name }}</div>
          <div class="ai-desc">{{ game.desc }}</div>
        </div>
      </div>
    </div>

    <h3 class="chat-section-title">开发工具</h3>
    <div class="ai-grid">
      <div v-for="tool in tools" :key="tool.name" class="ai-card tool-card" @click="$router.push(tool.route)">
        <div class="ai-icon">{{ tool.icon }}</div>
        <div class="ai-info">
          <div class="ai-name">{{ tool.name }}</div>
          <div class="ai-desc">{{ tool.desc }}</div>
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

const games = [
  { name: '五子棋', icon: '⚫', route: '/gomoku', desc: '经典五子棋对战' },
  { name: '飞机大战', icon: '✈️', route: '/plane-war', desc: '经典飞机大战射击' },
  { name: '俄罗斯方块', icon: '🧱', route: '/tetris', desc: '经典方块消除' },
  { name: '贪吃蛇', icon: '🐍', route: '/snake', desc: '经典贪吃蛇' },
  { name: '推箱子', icon: '📦', route: '/sokoban', desc: '经典推箱子解谜' },
]

const tools = [
  { name: 'Postman', icon: '🚀', route: '/api-tester', desc: 'API 接口请求测试工具' },
]

function openAI(url) {
  window.electronAPI.openExternal(url)
}
</script>

<style lang="scss" scoped>
.ai-chat-page { max-height: 100vh; overflow: auto; background: #1a1a2e; color: #e4e4e7; padding: 16px; }

.ai-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    font-size: 22px;
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

.chat-section-title { font-size: 15px; margin: 16px 0 10px; padding-left: 10px; border-left: 3px solid #667eea; }

.ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }

.ai-card {
  display: flex; align-items: center; gap: 12px; padding: 12px;
  background: #16213e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #667eea; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.15); }
}

.ai-icon { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2)); display: flex; align-items: center; justify-content: center; font-size: 20px; }

.ai-info { flex: 1; }
.ai-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.ai-desc { font-size: 12px; color: #a1a1aa; }

.game-card {
  border-color: rgba(168,85,247,0.3);
  &:hover { border-color: #a855f7; box-shadow: 0 4px 12px rgba(168,85,247,0.2); }
  .ai-icon { background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2)); }
}

.tool-card {
  border-color: rgba(34,197,94,0.3);
  &:hover { border-color: #22c55e; box-shadow: 0 4px 12px rgba(34,197,94,0.2); }
  .ai-icon { background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2)); }
}
</style>
