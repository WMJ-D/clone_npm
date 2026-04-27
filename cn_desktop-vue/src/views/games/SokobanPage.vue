<template>
  <div class="sokoban-page">
    <header class="game-header">
      <div class="header-left">
        <el-button @click="$router.push('/ai-chat')" size="small">← 返回</el-button>
        <h2>📦 推箱子</h2>
      </div>
      <div class="header-right">
        <div class="stats">
          <span class="stat-item">📊 关卡: {{ currentLevel + 1 }}/{{ levels.length }}</span>
          <span class="stat-item">👣 步数: {{ steps }}</span>
          <span class="stat-item">🔄 推动: {{ pushes }}</span>
        </div>
        <el-button @click="undo" size="small" :disabled="history.length === 0">撤销</el-button>
        <el-button @click="resetLevel" size="small">重置</el-button>
        <el-button v-if="won" type="primary" @click="nextLevel" size="small">下一关</el-button>
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

        <!-- 过关 -->
        <div v-if="won" class="win-overlay">
          <div class="win-content">
            <h2>🎉 恭喜过关！</h2>
            <p>步数: {{ steps }}</p>
            <p>推动: {{ pushes }}</p>
            <el-button v-if="currentLevel < levels.length - 1" type="primary" @click="nextLevel" size="large">下一关</el-button>
            <p v-else class="all-clear">🎊 恭喜通关所有关卡！</p>
            <el-button @click="resetLevel" size="small" style="margin-top: 10px">重玩本关</el-button>
          </div>
        </div>

        <!-- 开始提示 -->
        <div v-if="showStart" class="start-hint">
          <div class="start-content">
            <h2>📦 推箱子</h2>
            <p>↑ ↓ ← → 控制移动</p>
            <p>把所有箱子推到目标点</p>
            <p>按 Z 撤销上一步</p>
            <el-button type="primary" @click="showStart = false" size="large">开始游戏</el-button>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="info-card">
          <h3>🎮 操作说明</h3>
          <ul>
            <li>↑ ↓ ← → 移动角色</li>
            <li>Z 撤销上一步</li>
            <li>R 重置当前关卡</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>📊 图例</h3>
          <ul>
            <li>🧑 玩家</li>
            <li>🧱 墙壁</li>
            <li>📦 箱子</li>
            <li>🎯 目标点</li>
            <li>✅ 箱子在目标上</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>📋 关卡选择</h3>
          <div class="level-grid">
            <el-button v-for="(_, i) in levels" :key="i"
              :type="i === currentLevel ? 'primary' : 'default'"
              size="small"
              @click="selectLevel(i)">
              {{ i + 1 }}
            </el-button>
          </div>
        </div>

        <div class="info-card">
          <h3>💡 提示</h3>
          <ul>
            <li>箱子只能推不能拉</li>
            <li>避免把箱子推到角落</li>
            <li>可以撤销重新规划路线</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 地图元素
const FLOOR = 0
const WALL = 1
const TARGET = 2
const BOX = 3
const PLAYER = 4
const BOX_ON_TARGET = 5
const PLAYER_ON_TARGET = 6

// 关卡数据 (经典推箱子关卡)
const levels = [
  // 关卡 1 - 入门
  [
    [1,1,1,1,1,0,0,0],
    [1,0,0,0,1,0,0,0],
    [1,0,3,0,1,1,1,1],
    [1,0,3,4,0,0,0,1],
    [1,1,1,3,0,1,0,1],
    [0,0,1,0,0,1,0,1],
    [0,0,1,2,2,2,0,1],
    [0,0,1,1,1,1,1,1],
  ],
  // 关卡 2
  [
    [0,1,1,1,1,0],
    [1,1,0,0,1,0],
    [1,0,4,0,1,0],
    [1,1,3,0,1,1],
    [1,0,3,0,0,1],
    [1,0,0,3,0,1],
    [1,0,2,2,0,1],
    [1,0,2,0,0,1],
    [1,1,1,1,1,1],
  ],
  // 关卡 3
  [
    [0,0,1,1,1,1,1,0],
    [0,0,1,0,0,0,1,0],
    [1,1,1,3,1,0,1,1],
    [1,0,0,3,0,3,0,1],
    [1,0,0,1,3,1,0,1],
    [1,1,1,1,0,1,1,1],
    [0,0,0,1,4,0,1,0],
    [0,0,0,1,2,2,1,0],
    [0,0,0,1,2,0,1,0],
    [0,0,0,1,1,1,1,0],
  ],
  // 关卡 4
  [
    [0,0,1,1,1,1,0,0],
    [0,0,1,2,2,1,0,0],
    [1,1,1,2,2,1,1,1],
    [1,0,0,3,3,0,0,1],
    [1,0,3,3,3,3,0,1],
    [1,0,0,3,3,0,0,1],
    [1,1,1,0,4,1,1,1],
    [0,0,1,1,1,1,0,0],
  ],
  // 关卡 5
  [
    [0,0,0,1,1,1,1,1,1],
    [0,0,0,1,0,0,0,0,1],
    [0,0,0,1,0,1,0,0,1],
    [1,1,1,1,0,1,0,1,1],
    [1,2,2,0,3,0,0,1,0],
    [1,2,2,3,0,3,1,1,0],
    [1,1,1,1,3,0,1,0,0],
    [0,0,0,1,0,0,1,0,0],
    [0,0,0,1,0,4,1,0,0],
    [0,0,0,1,1,1,1,0,0],
  ],
  // 关卡 6
  [
    [0,0,1,1,1,1,1,0],
    [1,1,1,0,0,0,1,0],
    [1,2,0,3,0,0,1,0],
    [1,2,2,3,3,0,1,1],
    [1,2,0,0,3,0,0,1],
    [1,1,1,0,0,3,0,1],
    [0,0,1,0,4,0,0,1],
    [0,0,1,1,1,1,1,1],
  ],
  // 关卡 7
  [
    [0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,3,0,0,1],
    [1,0,1,1,3,0,3,0,1],
    [1,0,0,1,0,1,0,1,1],
    [1,1,0,0,3,0,0,1,0],
    [0,1,0,1,0,1,0,1,0],
    [0,1,0,0,0,0,3,1,0],
    [0,1,0,0,4,0,0,1,0],
    [0,1,1,1,1,1,1,1,0],
    [0,0,0,0,1,2,2,1,0],
    [0,0,0,0,1,2,2,1,0],
    [0,0,0,0,1,1,1,1,0],
  ],
  // 关卡 8
  [
    [0,0,0,1,1,1,1,1,0],
    [0,0,0,1,0,4,0,1,0],
    [0,0,0,1,0,0,0,1,0],
    [1,1,1,1,3,1,0,1,1],
    [1,2,2,0,3,0,3,0,1],
    [1,2,2,0,0,3,0,0,1],
    [1,1,1,1,3,1,1,1,1],
    [0,0,0,1,0,0,0,1,0],
    [0,0,0,1,0,0,0,1,0],
    [0,0,0,1,1,1,1,1,0],
  ],
  // 关卡 9
  [
    [0,0,1,1,1,1,0,0,0],
    [0,0,1,0,0,1,0,0,0],
    [0,0,1,0,0,1,1,1,1],
    [1,1,1,3,0,0,0,0,1],
    [1,2,2,0,3,1,3,0,1],
    [1,2,2,0,0,0,0,0,1],
    [1,1,1,1,3,1,1,1,1],
    [0,0,0,1,0,0,0,1,0],
    [0,0,0,1,0,4,0,1,0],
    [0,0,0,1,1,1,1,1,0],
  ],
  // 关卡 10
  [
    [0,0,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,3,0,0,0,1],
    [1,0,1,0,1,1,1,0,1,1],
    [1,0,0,3,0,0,0,3,0,1],
    [1,1,0,1,3,1,1,0,0,1],
    [0,1,0,0,0,0,1,0,1,1],
    [0,1,0,0,3,0,0,0,1,0],
    [0,1,0,0,0,4,0,0,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,1,2,2,2,1,0],
    [0,0,0,0,1,2,2,2,1,0],
    [0,0,0,0,1,1,1,1,1,0],
  ],
]

const currentLevel = ref(0)
const board = ref([])
const playerPos = ref({ x: 0, y: 0 })
const steps = ref(0)
const pushes = ref(0)
const history = ref([])
const won = ref(false)
const showStart = ref(true)

const cellClassMap = {
  [FLOOR]: 'FLOOR',
  [WALL]: 'WALL',
  [TARGET]: 'TARGET',
  [BOX]: 'BOX',
  [PLAYER]: 'PLAYER',
  [BOX_ON_TARGET]: 'BOX_ON_TARGET',
  [PLAYER_ON_TARGET]: 'PLAYER_ON_TARGET',
}

const displayBoard = computed(() => {
  return board.value.map(row => row.map(cell => cellClassMap[cell] || 'FLOOR'))
})

function initLevel(levelIndex) {
  const level = levels[levelIndex]
  board.value = level.map(row => [...row])
  history.value = []
  steps.value = 0
  pushes.value = 0
  won.value = false

  // 找到玩家位置
  for (let y = 0; y < board.value.length; y++) {
    for (let x = 0; x < board.value[y].length; x++) {
      if (board.value[y][x] === PLAYER || board.value[y][x] === PLAYER_ON_TARGET) {
        playerPos.value = { x, y }
        return
      }
    }
  }
}

function selectLevel(index) {
  currentLevel.value = index
  initLevel(index)
}

function resetLevel() {
  initLevel(currentLevel.value)
}

function nextLevel() {
  if (currentLevel.value < levels.length - 1) {
    currentLevel.value++
    initLevel(currentLevel.value)
  }
}

function checkWin() {
  for (let y = 0; y < board.value.length; y++) {
    for (let x = 0; x < board.value[y].length; x++) {
      if (board.value[y][x] === TARGET || board.value[y][x] === PLAYER_ON_TARGET) {
        return false
      }
    }
  }
  return true
}

function movePlayer(dx, dy) {
  if (won.value) return

  const px = playerPos.value.x
  const py = playerPos.value.y
  const nx = px + dx
  const ny = py + dy

  // 边界检查
  if (ny < 0 || ny >= board.value.length || nx < 0 || nx >= board.value[0].length) return

  const target = board.value[ny][nx]

  // 如果目标是墙壁，不能移动
  if (target === WALL) return

  // 如果目标是空地或目标点，直接移动
  if (target === FLOOR || target === TARGET) {
    // 保存历史
    history.value.push({
      playerPos: { ...playerPos.value },
      board: board.value.map(row => [...row]),
      steps: steps.value,
      pushes: pushes.value
    })

    // 移动玩家
    board.value[py][px] = board.value[py][px] === PLAYER_ON_TARGET ? TARGET : FLOOR
    board.value[ny][nx] = target === TARGET ? PLAYER_ON_TARGET : PLAYER
    playerPos.value = { x: nx, y: ny }
    steps.value++
    return
  }

  // 如果目标是箱子，检查箱子后面是否可以推
  if (target === BOX || target === BOX_ON_TARGET) {
    const bx = nx + dx
    const by = ny + dy

    // 边界检查
    if (by < 0 || by >= board.value.length || bx < 0 || bx >= board.value[0].length) return

    const behind = board.value[by][bx]

    // 箱子后面必须是空地或目标点
    if (behind !== FLOOR && behind !== TARGET) return

    // 保存历史
    history.value.push({
      playerPos: { ...playerPos.value },
      board: board.value.map(row => [...row]),
      steps: steps.value,
      pushes: pushes.value
    })

    // 推箱子
    board.value[by][bx] = behind === TARGET ? BOX_ON_TARGET : BOX
    board.value[ny][nx] = target === BOX_ON_TARGET ? PLAYER_ON_TARGET : PLAYER
    board.value[py][px] = board.value[py][px] === PLAYER_ON_TARGET ? TARGET : FLOOR
    playerPos.value = { x: nx, y: ny }
    steps.value++
    pushes.value++

    // 检查是否过关
    if (checkWin()) {
      won.value = true
    }
  }
}

function undo() {
  if (history.value.length === 0) return

  const last = history.value.pop()
  playerPos.value = last.playerPos
  board.value = last.board
  steps.value = last.steps
  pushes.value = last.pushes
  won.value = false
}

function handleKeyDown(e) {
  if (showStart.value) {
    if (e.code === 'Enter' || e.code === 'Space') {
      showStart.value = false
    }
    return
  }

  switch (e.code) {
    case 'ArrowUp':
      e.preventDefault()
      movePlayer(0, -1)
      break
    case 'ArrowDown':
      e.preventDefault()
      movePlayer(0, 1)
      break
    case 'ArrowLeft':
      e.preventDefault()
      movePlayer(-1, 0)
      break
    case 'ArrowRight':
      e.preventDefault()
      movePlayer(1, 0)
      break
    case 'KeyZ':
      undo()
      break
    case 'KeyR':
      resetLevel()
      break
  }
}

onMounted(() => {
  initLevel(0)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style lang="scss" scoped>
.sokoban-page {
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
      background-clip: text;
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
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 1px solid rgba(255,255,255,0.05);

  &.FLOOR {
    background: rgba(255,255,255,0.03);
  }

  &.WALL {
    background: #4a5568;
    border: 1px solid #2d3748;
    box-shadow: inset 0 0 8px rgba(0,0,0,0.3);
  }

  &.TARGET {
    background: rgba(255,255,255,0.03);
    &::after {
      content: '🎯';
      font-size: 16px;
      opacity: 0.6;
    }
  }

  &.BOX {
    background: #d97706;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2);
    &::after {
      content: '📦';
      font-size: 20px;
    }
  }

  &.PLAYER {
    background: rgba(255,255,255,0.03);
    &::after {
      content: '🧑';
      font-size: 22px;
    }
  }

  &.BOX_ON_TARGET {
    background: #16a34a;
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(22,163,74,0.5), inset 0 1px 2px rgba(255,255,255,0.2);
    &::after {
      content: '✅';
      font-size: 20px;
    }
  }

  &.PLAYER_ON_TARGET {
    background: rgba(255,255,255,0.03);
    &::after {
      content: '🧑';
      font-size: 22px;
    }
  }
}

.win-overlay, .start-hint {
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

.win-content, .start-content {
  text-align: center;
  padding: 30px;
  background: #16213e;
  border-radius: 12px;
  border: 1px solid rgba(102,126,234,0.3);

  h2 {
    font-size: 24px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: #a1a1aa;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .all-clear {
    color: #f59e0b;
    font-size: 16px;
    font-weight: bold;
    margin-top: 10px;
  }
}

.side-panel {
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

  ul {
    padding-left: 16px;
    li {
      font-size: 12px;
      color: #a1a1aa;
      margin-bottom: 6px;
      line-height: 1.4;
    }
  }

  .level-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
}
</style>
