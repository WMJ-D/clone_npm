<template>
  <div class="gomoku-page">
    <header class="game-header">
      <div class="header-left">
        <el-button @click="$router.push('/ai-chat')" size="small">← 返回</el-button>
        <h2>⚫ 五子棋</h2>
      </div>
      <div class="header-right">
        <div class="status">
          <span v-if="winner" class="winner-text">🎉 {{ winner === 'black' ? '黑棋' : '白棋' }}获胜！</span>
          <span v-else class="turn-text">{{ currentPlayer === 'black' ? '⚫ 黑棋' : '⚪ 白棋' }}落子</span>
        </div>
        <el-button type="primary" @click="resetGame" size="small">重新开始</el-button>
      </div>
    </header>

    <div class="game-container">
      <div class="board-wrapper">
        <div class="board" :style="{ width: boardSize + 'px', height: boardSize + 'px' }">
          <!-- 棋盘网格线 -->
          <svg class="grid-lines" :width="boardSize" :height="boardSize">
            <line v-for="i in 15" :key="'h'+i"
              :x1="padding" :y1="padding + (i-1) * cellSize"
              :x2="padding + 14 * cellSize" :y2="padding + (i-1) * cellSize"
              stroke="#4a5568" stroke-width="1" />
            <line v-for="i in 15" :key="'v'+i"
              :x1="padding + (i-1) * cellSize" :y1="padding"
              :x2="padding + (i-1) * cellSize" :y2="padding + 14 * cellSize"
              stroke="#4a5568" stroke-width="1" />
            <!-- 星位 -->
            <circle v-for="pos in starPositions" :key="pos.x+','+pos.y"
              :cx="padding + pos.x * cellSize" :cy="padding + pos.y * cellSize"
              r="3" fill="#4a5568" />
          </svg>

          <!-- 棋子 -->
          <div v-for="(row, y) in board" :key="y" class="board-row">
            <div v-for="(cell, x) in row" :key="x"
              class="cell"
              :style="{
                left: (padding + x * cellSize - cellSize/2) + 'px',
                top: (padding + y * cellSize - cellSize/2) + 'px',
                width: cellSize + 'px',
                height: cellSize + 'px'
              }"
              @click="placeStone(x, y)">
              <div v-if="cell" :class="['stone', cell, { 'last-move': lastMove?.x === x && lastMove?.y === y }]">
                <div v-if="lastMove?.x === x && lastMove?.y === y" class="last-dot"></div>
              </div>
              <div v-else-if="!winner && isValidMove(x, y)" class="hover-area"
                @mouseenter="hoverPos = { x, y }" @mouseleave="hoverPos = null">
                <div v-if="hoverPos?.x === x && hoverPos?.y === y"
                  :class="['ghost-stone', currentPlayer]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="game-info">
        <div class="info-card">
          <h3>游戏信息</h3>
          <div class="info-row">
            <span>黑棋数：</span>
            <span>{{ blackCount }}</span>
          </div>
          <div class="info-row">
            <span>白棋数：</span>
            <span>{{ whiteCount }}</span>
          </div>
          <div class="info-row">
            <span>总步数：</span>
            <span>{{ moveCount }}</span>
          </div>
        </div>

        <div class="info-card">
          <h3>操作说明</h3>
          <ul>
            <li>点击棋盘交叉点落子</li>
            <li>黑棋先行</li>
            <li>五子连珠获胜</li>
            <li>横、竖、斜均可</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>最近落子</h3>
          <div v-if="moveHistory.length > 0" class="move-list">
            <div v-for="(move, i) in lastMoves" :key="i" class="move-item">
              <span :class="['dot', move.player]"></span>
              <span>{{ move.player === 'black' ? '黑' : '白' }} ({{ move.x + 1 }}, {{ move.y + 1 }})</span>
            </div>
          </div>
          <div v-else class="empty-text">暂无落子</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const BOARD_SIZE = 15
const cellSize = 36
const padding = 24
const boardSize = padding * 2 + (BOARD_SIZE - 1) * cellSize

const board = ref(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)))
const currentPlayer = ref('black')
const winner = ref(null)
const lastMove = ref(null)
const moveHistory = ref([])
const hoverPos = ref(null)

const starPositions = [
  { x: 3, y: 3 }, { x: 3, y: 11 },
  { x: 7, y: 7 },
  { x: 11, y: 3 }, { x: 11, y: 11 }
]

const blackCount = computed(() => board.value.flat().filter(c => c === 'black').length)
const whiteCount = computed(() => board.value.flat().filter(c => c === 'white').length)
const moveCount = computed(() => moveHistory.value.length)

const lastMoves = computed(() => {
  return moveHistory.value.slice(-5).reverse()
})

function isValidMove(x, y) {
  return !winner.value && board.value[y][x] === null
}

function placeStone(x, y) {
  if (!isValidMove(x, y)) return

  board.value[y][x] = currentPlayer.value
  lastMove.value = { x, y }
  moveHistory.value.push({ x, y, player: currentPlayer.value })

  if (checkWin(x, y, currentPlayer.value)) {
    winner.value = currentPlayer.value
    return
  }

  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
}

function checkWin(x, y, player) {
  const directions = [
    [1, 0],   // 水平
    [0, 1],   // 垂直
    [1, 1],   // 右下斜
    [1, -1]   // 右上斜
  ]

  for (const [dx, dy] of directions) {
    let count = 1

    // 正方向
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i
      const ny = y + dy * i
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break
      if (board.value[ny][nx] !== player) break
      count++
    }

    // 反方向
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i
      const ny = y - dy * i
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break
      if (board.value[ny][nx] !== player) break
      count++
    }

    if (count >= 5) return true
  }

  return false
}

function resetGame() {
  board.value = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
  currentPlayer.value = 'black'
  winner.value = null
  lastMove.value = null
  moveHistory.value = []
  hoverPos.value = null
}
</script>

<style lang="scss" scoped>
.gomoku-page {
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
  padding: 12px 20px;
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

    .status {
      font-size: 14px;
    }

    .winner-text {
      color: #f59e0b;
      font-weight: 600;
    }

    .turn-text {
      color: #a1a1aa;
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
  overflow: auto;
}

.board-wrapper {
  flex-shrink: 0;
}

.board {
  position: relative;
  background: #d4a574;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.board-row {
  position: absolute;
  top: 0;
  left: 0;
}

.cell {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;
}

.stone {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  position: relative;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);

  &.black {
    background: radial-gradient(circle at 35% 35%, #555, #000);
  }

  &.white {
    background: radial-gradient(circle at 35% 35%, #fff, #ccc);
  }

  &.last-move {
    box-shadow: 0 0 8px 2px rgba(245,158,11,0.6);
  }
}

.last-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
}

.hover-area {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ghost-stone {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  opacity: 0.3;

  &.black {
    background: #000;
  }

  &.white {
    background: #fff;
  }
}

.game-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 180px;
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

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: #a1a1aa;
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

.move-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.move-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #a1a1aa;

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;

    &.black { background: #000; }
    &.white { background: #fff; border: 1px solid #ccc; }
  }
}

.empty-text {
  font-size: 12px;
  color: #666;
  text-align: center;
  padding: 8px;
}
</style>
