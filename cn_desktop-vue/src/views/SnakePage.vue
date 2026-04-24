<template>
  <div class="snake-page">
    <header class="game-header">
      <div class="header-left">
        <el-button @click="$router.push('/ai-chat')" size="small">← 返回</el-button>
        <h2>🐍 贪吃蛇</h2>
      </div>
      <div class="header-right">
        <div class="stats">
          <span class="stat-item">🏆 分数: {{ score }}</span>
          <span class="stat-item">📏 长度: {{ snake.length }}</span>
          <span class="stat-item">⚡ 速度: {{ speed }}</span>
        </div>
        <el-button v-if="!gameRunning" type="primary" @click="startGame" size="small">
          {{ gameOver ? '重新开始' : '开始游戏' }}
        </el-button>
        <el-button v-else @click="togglePause" size="small">
          {{ paused ? '继续' : '暂停' }}
        </el-button>
      </div>
    </header>

    <div class="game-container">
      <div class="game-board">
        <div class="board-grid">
          <div v-for="(row, y) in displayBoard" :key="y" class="board-row">
            <div v-for="(cell, x) in row" :key="x"
              :class="['cell', cell]">
            </div>
          </div>
        </div>

        <!-- 游戏结束 -->
        <div v-if="gameOver" class="game-over">
          <div class="game-over-content">
            <h2>游戏结束</h2>
            <p>最终得分: {{ score }}</p>
            <p>蛇身长度: {{ snake.length }}</p>
            <el-button type="primary" @click="startGame">再来一局</el-button>
          </div>
        </div>

        <!-- 暂停 -->
        <div v-if="paused && !gameOver" class="pause-overlay">
          <div class="pause-text">⏸️ 暂停中</div>
        </div>

        <!-- 开始提示 -->
        <div v-if="!gameRunning && !gameOver" class="start-hint">
          <div class="start-content">
            <h2>🐍 贪吃蛇</h2>
            <p>↑ ↓ ← → 控制方向</p>
            <p>吃食物增长得分</p>
            <p>撞墙或撞自己游戏结束</p>
            <el-button type="primary" @click="startGame" size="large">开始游戏</el-button>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="info-card">
          <h3>🎮 操作说明</h3>
          <ul>
            <li>↑ ↓ ← → 控制方向</li>
            <li>P 暂停游戏</li>
            <li>不能直接掉头</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>📊 游戏规则</h3>
          <ul>
            <li>🐍 蛇头（深绿色）</li>
            <li>🟢 蛇身（绿色）</li>
            <li>🍎 食物（红色）</li>
            <li>吃食物得分+10</li>
            <li>速度随分数增加</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>🏆 最高分</h3>
          <div class="high-score">
            {{ highScore }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const COLS = 20
const ROWS = 20

const snake = ref([{ x: 10, y: 10 }])
const food = ref({ x: 15, y: 15 })
const direction = ref({ x: 1, y: 0 })
const nextDirection = ref({ x: 1, y: 0 })
const score = ref(0)
const highScore = ref(parseInt(localStorage.getItem('snakeHighScore') || '0'))
const gameRunning = ref(false)
const gameOver = ref(false)
const paused = ref(false)
const speed = ref(1)

let gameLoop = null
let baseInterval = 150

const displayBoard = computed(() => {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'))

  // 画蛇身
  snake.value.forEach((segment, i) => {
    if (segment.x >= 0 && segment.x < COLS && segment.y >= 0 && segment.y < ROWS) {
      board[segment.y][segment.x] = i === 0 ? 'head' : 'body'
    }
  })

  // 画食物
  if (food.value.x >= 0 && food.value.x < COLS && food.value.y >= 0 && food.value.y < ROWS) {
    board[food.value.y][food.value.x] = 'food'
  }

  return board
})

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  stopGame()
  document.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(e) {
  if (!gameRunning.value || gameOver.value) return

  if (e.code === 'KeyP') {
    togglePause()
    return
  }

  if (paused.value) return

  const keyMap = {
    'ArrowUp': { x: 0, y: -1 },
    'ArrowDown': { x: 0, y: 1 },
    'ArrowLeft': { x: -1, y: 0 },
    'ArrowRight': { x: 1, y: 0 }
  }

  const newDir = keyMap[e.code]
  if (newDir) {
    e.preventDefault()
    // 不能直接掉头
    if (newDir.x !== -direction.value.x || newDir.y !== -direction.value.y) {
      nextDirection.value = newDir
    }
  }
}

function startGame() {
  snake.value = [{ x: 10, y: 10 }]
  direction.value = { x: 1, y: 0 }
  nextDirection.value = { x: 1, y: 0 }
  score.value = 0
  speed.value = 1
  gameOver.value = false
  paused.value = false
  gameRunning.value = true

  spawnFood()

  if (gameLoop) clearInterval(gameLoop)
  gameLoop = setInterval(gameStep, baseInterval)
}

function stopGame() {
  gameRunning.value = false
  if (gameLoop) clearInterval(gameLoop)
}

function togglePause() {
  paused.value = !paused.value
  if (paused.value) {
    if (gameLoop) clearInterval(gameLoop)
  } else {
    gameLoop = setInterval(gameStep, baseInterval / speed.value)
  }
}

function gameStep() {
  if (paused.value || gameOver.value) return

  direction.value = { ...nextDirection.value }

  const head = {
    x: snake.value[0].x + direction.value.x,
    y: snake.value[0].y + direction.value.y
  }

  // 撞墙检测
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    endGame()
    return
  }

  // 撞自己检测
  if (snake.value.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame()
    return
  }

  snake.value.unshift(head)

  // 吃食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += 10
    if (score.value > highScore.value) {
      highScore.value = score.value
      localStorage.setItem('snakeHighScore', highScore.value.toString())
    }
    speed.value = Math.min(5, Math.floor(score.value / 50) + 1)
    if (gameLoop) clearInterval(gameLoop)
    gameLoop = setInterval(gameStep, baseInterval / speed.value)
    spawnFood()
  } else {
    snake.value.pop()
  }
}

function spawnFood() {
  let newFood
  do {
    newFood = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    }
  } while (snake.value.some(seg => seg.x === newFood.x && seg.y === newFood.y))
  food.value = newFood
}

function endGame() {
  gameOver.value = true
  stopGame()
}
</script>

<style lang="scss" scoped>
.snake-page {
  height: 100vh;
  background: #1a1a2e;
  color: #e4e4e7;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game-header {
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
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .stats {
      display: flex;
      gap: 16px;
      font-size: 14px;

      .stat-item {
        color: #a1a1aa;
      }
    }
  }
}

.game-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  padding: 20px;
}

.game-board {
  position: relative;
  background: #0d1117;
  border: 2px solid rgba(102,126,234,0.3);
  border-radius: 8px;
  padding: 10px;
}

.board-grid {
  display: flex;
  flex-direction: column;
}

.board-row {
  display: flex;
}

.cell {
  width: 25px;
  height: 25px;
  border: 1px solid rgba(255,255,255,0.05);

  &.empty {
    background: rgba(255,255,255,0.02);
  }

  &.head {
    background: #00aa00;
    border-radius: 4px;
    box-shadow: 0 0 8px rgba(0,170,0,0.5);
  }

  &.body {
    background: #00cc00;
    border-radius: 3px;
  }

  &.food {
    background: #ff4444;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(255,68,68,0.5);
  }
}

.game-over, .pause-overlay, .start-hint {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.85);
  z-index: 10;
  border-radius: 8px;
}

.game-over-content, .start-content {
  text-align: center;
  padding: 30px;
  background: #16213e;
  border-radius: 12px;
  border: 1px solid rgba(102,126,234,0.3);

  h2 {
    font-size: 24px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: #a1a1aa;
    margin-bottom: 8px;
    font-size: 14px;
  }
}

.pause-text {
  font-size: 28px;
  color: #a1a1aa;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 160px;
}

.info-card {
  background: #16213e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 16px;

  h3 {
    font-size: 14px;
    color: #a5b4fc;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  ul {
    padding-left: 16px;
    li {
      font-size: 12px;
      color: #a1a1aa;
      margin-bottom: 6px;
      line-height: 1.4;
    }
  }

  .high-score {
    font-size: 24px;
    font-weight: bold;
    color: #f59e0b;
    text-align: center;
    padding: 10px;
  }
}
</style>
