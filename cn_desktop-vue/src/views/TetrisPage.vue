<template>
  <div class="tetris-page">
    <header class="game-header">
      <div class="header-left">
        <el-button @click="$router.push('/ai-chat')" size="small">← 返回</el-button>
        <h2>🧱 俄罗斯方块</h2>
      </div>
      <div class="header-right">
        <div class="stats">
          <span class="stat-item">🏆 分数: {{ score }}</span>
          <span class="stat-item">📊 等级: {{ level }}</span>
          <span class="stat-item">📋 行数: {{ lines }}</span>
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
              :class="['cell', cell ? 'filled' : 'empty', cell ? `color-${cell}` : '']">
            </div>
          </div>
        </div>

        <!-- 游戏结束 -->
        <div v-if="gameOver" class="game-over">
          <div class="game-over-content">
            <h2>游戏结束</h2>
            <p>最终得分: {{ score }}</p>
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
            <h2>🧱 俄罗斯方块</h2>
            <p>← → 移动方块</p>
            <p>↑ 旋转方块</p>
            <p>↓ 加速下落</p>
            <p>空格 直接落下</p>
            <el-button type="primary" @click="startGame" size="large">开始游戏</el-button>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="next-piece">
          <h3>下一个</h3>
          <div class="piece-preview">
            <div v-for="(row, y) in nextPieceShape" :key="y" class="piece-row">
              <div v-for="(cell, x) in row" :key="x"
                :class="['piece-cell', cell ? 'filled' : 'empty', cell ? `color-${cell}` : '']">
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3>🎮 操作说明</h3>
          <ul>
            <li>← → 左右移动</li>
            <li>↑ 旋转方块</li>
            <li>↓ 加速下落</li>
            <li>空格 直接落下</li>
            <li>P 暂停游戏</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>📊 游戏规则</h3>
          <ul>
            <li>填满一行消除得分</li>
            <li>同时消除多行加分</li>
            <li>每10行升一级</li>
            <li>方块堆到顶部游戏结束</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const COLS = 10
const ROWS = 20
const COLORS = ['I', 'O', 'T', 'S', 'Z', 'L', 'J']

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  L: [[1, 0], [1, 0], [1, 1]],
  J: [[0, 1], [0, 1], [1, 1]]
}

const board = ref(Array.from({ length: ROWS }, () => Array(COLS).fill(0)))
const currentPiece = ref(null)
const currentPos = ref({ x: 0, y: 0 })
const currentColor = ref('')
const nextPiece = ref(null)
const nextColor = ref('')
const score = ref(0)
const level = ref(1)
const lines = ref(0)
const gameRunning = ref(false)
const gameOver = ref(false)
const paused = ref(false)

let gameLoop = null
let dropInterval = 1000

const displayBoard = computed(() => {
  const display = board.value.map(row => [...row])
  if (currentPiece.value) {
    currentPiece.value.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = currentPos.value.y + y
          const boardX = currentPos.value.x + x
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            display[boardY][boardX] = currentColor.value
          }
        }
      })
    })
  }
  return display
})

const nextPieceShape = computed(() => {
  if (!nextPiece.value) return Array.from({ length: 4 }, () => Array(4).fill(0))
  const shape = Array.from({ length: 4 }, () => Array(4).fill(0))
  nextPiece.value.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) shape[y][x] = nextColor.value
    })
  })
  return shape
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

  switch (e.code) {
    case 'ArrowLeft':
      movePiece(-1, 0)
      break
    case 'ArrowRight':
      movePiece(1, 0)
      break
    case 'ArrowDown':
      movePiece(0, 1)
      break
    case 'ArrowUp':
      rotatePiece()
      break
    case 'Space':
      e.preventDefault()
      hardDrop()
      break
  }
}

function startGame() {
  board.value = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  score.value = 0
  level.value = 1
  lines.value = 0
  gameOver.value = false
  paused.value = false
  gameRunning.value = true
  dropInterval = 1000

  spawnPiece()
  spawnPiece()

  if (gameLoop) clearInterval(gameLoop)
  gameLoop = setInterval(gameStep, dropInterval)
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
    gameLoop = setInterval(gameStep, dropInterval)
  }
}

function spawnPiece() {
  if (nextPiece.value) {
    currentPiece.value = nextPiece.value
    currentColor.value = nextColor.value
  } else {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    currentPiece.value = SHAPES[color]
    currentColor.value = color
  }

  const nextColorKey = COLORS[Math.floor(Math.random() * COLORS.length)]
  nextPiece.value = SHAPES[nextColorKey]
  nextColor.value = nextColorKey

  currentPos.value = {
    x: Math.floor((COLS - currentPiece.value[0].length) / 2),
    y: 0
  }

  if (!isValidPosition(currentPiece.value, currentPos.value)) {
    gameOver.value = true
    stopGame()
  }
}

function gameStep() {
  if (paused.value || gameOver.value) return

  if (!movePiece(0, 1)) {
    placePiece()
    clearLines()
    spawnPiece()
  }
}

function movePiece(dx, dy) {
  const newPos = { x: currentPos.value.x + dx, y: currentPos.value.y + dy }
  if (isValidPosition(currentPiece.value, newPos)) {
    currentPos.value = newPos
    return true
  }
  return false
}

function rotatePiece() {
  const rotated = currentPiece.value[0].map((_, i) =>
    currentPiece.value.map(row => row[i]).reverse()
  )
  if (isValidPosition(rotated, currentPos.value)) {
    currentPiece.value = rotated
  }
}

function hardDrop() {
  while (movePiece(0, 1)) {}
  placePiece()
  clearLines()
  spawnPiece()
}

function isValidPosition(piece, pos) {
  return piece.every((row, y) =>
    row.every((cell, x) => {
      if (!cell) return true
      const boardX = pos.x + x
      const boardY = pos.y + y
      return boardX >= 0 && boardX < COLS && boardY >= 0 && boardY < ROWS &&
        !board.value[boardY][boardX]
    })
  )
}

function placePiece() {
  currentPiece.value.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        const boardY = currentPos.value.y + y
        const boardX = currentPos.value.x + x
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board.value[boardY][boardX] = currentColor.value
        }
      }
    })
  })
}

function clearLines() {
  let cleared = 0
  board.value = board.value.filter(row => !row.every(cell => cell))
  cleared = ROWS - board.value.length
  while (board.value.length < ROWS) {
    board.value.unshift(Array(COLS).fill(0))
  }

  if (cleared > 0) {
    lines.value += cleared
    const points = [0, 100, 300, 500, 800]
    score.value += points[cleared] * level.value
    level.value = Math.floor(lines.value / 10) + 1
    dropInterval = Math.max(100, 1000 - (level.value - 1) * 100)
    if (gameLoop) clearInterval(gameLoop)
    gameLoop = setInterval(gameStep, dropInterval)
  }
}
</script>

<style lang="scss" scoped>
.tetris-page {
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

  &.filled {
    border-radius: 3px;
    box-shadow: inset 0 0 5px rgba(255,255,255,0.2);
  }

  &.color-I { background: #00f0f0; }
  &.color-O { background: #f0f000; }
  &.color-T { background: #a000f0; }
  &.color-S { background: #00f000; }
  &.color-Z { background: #f00000; }
  &.color-L { background: #f0a000; }
  &.color-J { background: #0000f0; }
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

.next-piece {
  background: #16213e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 16px;

  h3 {
    font-size: 14px;
    color: #a5b4fc;
    margin-bottom: 12px;
  }

  .piece-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .piece-row {
    display: flex;
  }

  .piece-cell {
    width: 20px;
    height: 20px;
    border: 1px solid rgba(255,255,255,0.05);

    &.empty { background: transparent; }
    &.filled { border-radius: 2px; }

    &.color-I { background: #00f0f0; }
    &.color-O { background: #f0f000; }
    &.color-T { background: #a000f0; }
    &.color-S { background: #00f000; }
    &.color-Z { background: #f00000; }
    &.color-L { background: #f0a000; }
    &.color-J { background: #0000f0; }
  }
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
}
</style>
