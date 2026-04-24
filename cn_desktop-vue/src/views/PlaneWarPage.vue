<template>
  <div class="plane-war-page">
    <header class="game-header">
      <div class="header-left">
        <el-button @click="$router.push('/ai-chat')" size="small">← 返回</el-button>
        <h2>✈️ 飞机大战</h2>
      </div>
      <div class="header-right">
        <div class="stats">
          <span class="stat-item">🏆 分数: {{ score }}</span>
          <span class="stat-item">❤️ 生命: {{ lives }}</span>
          <span class="stat-item">📊 等级: {{ level }}</span>
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
      <div class="game-area" ref="gameArea" @mousemove="handleMouseMove" @click="shoot">
        <!-- 背景星空 -->
        <div class="stars" v-for="i in 50" :key="i"
          :style="{
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animationDelay: Math.random() * 3 + 's',
            animationDuration: (2 + Math.random() * 3) + 's'
          }"></div>

        <!-- 玩家飞机 -->
        <div v-if="!gameOver" class="player-plane"
          :style="{ left: playerX + 'px', top: playerY + 'px' }">
          <div class="plane-body">🛩️</div>
          <div v-if="shooting" class="shoot-effect"></div>
        </div>

        <!-- 子弹 -->
        <div v-for="bullet in bullets" :key="bullet.id" class="bullet"
          :style="{ left: bullet.x + 'px', top: bullet.y + 'px' }"></div>

        <!-- 敌机 -->
        <div v-for="enemy in enemies" :key="enemy.id" :class="['enemy', enemy.type]"
          :style="{ left: enemy.x + 'px', top: enemy.y + 'px', width: enemy.width + 'px', height: enemy.height + 'px' }">
          <span class="enemy-icon">{{ enemy.icon }}</span>
          <div class="enemy-health">
            <div class="health-bar" :style="{ width: (enemy.hp / enemy.maxHp * 100) + '%' }"></div>
          </div>
        </div>

        <!-- 爆炸效果 -->
        <div v-for="explosion in explosions" :key="explosion.id" class="explosion"
          :style="{ left: explosion.x + 'px', top: explosion.y + 'px' }">
          💥
        </div>

        <!-- 道具 -->
        <div v-for="powerUp in powerUps" :key="powerUp.id" :class="['power-up', powerUp.type]"
          :style="{ left: powerUp.x + 'px', top: powerUp.y + 'px' }">
          {{ powerUp.icon }}
        </div>

        <!-- 游戏结束 -->
        <div v-if="gameOver" class="game-over">
          <div class="game-over-content">
            <h2>游戏结束</h2>
            <p>最终得分: {{ score }}</p>
            <p>到达等级: {{ level }}</p>
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
            <h2>✈️ 飞机大战</h2>
            <p>鼠标移动控制飞机</p>
            <p>点击射击</p>
            <p>消灭敌机获得分数</p>
            <el-button type="primary" @click="startGame" size="large">开始游戏</el-button>
          </div>
        </div>
      </div>

      <!-- 侧边信息 -->
      <div class="side-info">
        <div class="info-card">
          <h3>🎮 操作说明</h3>
          <ul>
            <li>🖱️ 鼠标移动 - 控制飞机</li>
            <li>🖱️ 鼠标点击 - 射击</li>
            <li>⌨️ 空格键 - 射击</li>
            <li>⌨️ P键 - 暂停</li>
          </ul>
        </div>

        <div class="info-card">
          <h3>🎯 敌机类型</h3>
          <div class="enemy-list">
            <div class="enemy-item">
              <span>🛸</span>
              <span>小型机 (1血)</span>
            </div>
            <div class="enemy-item">
              <span>🚀</span>
              <span>中型机 (3血)</span>
            </div>
            <div class="enemy-item">
              <span>🛸</span>
              <span>大型机 (5血)</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3>💎 道具</h3>
          <div class="powerup-list">
            <div class="powerup-item">
              <span>❤️</span>
              <span>生命+1</span>
            </div>
            <div class="powerup-item">
              <span>⚡</span>
              <span>双倍火力</span>
            </div>
            <div class="powerup-item">
              <span>🛡️</span>
              <span>护盾</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const gameArea = ref(null)
const gameRunning = ref(false)
const gameOver = ref(false)
const paused = ref(false)
const score = ref(0)
const lives = ref(3)
const level = ref(1)

const playerX = ref(200)
const playerY = ref(500)
const shooting = ref(false)

const bullets = ref([])
const enemies = ref([])
const explosions = ref([])
const powerUps = ref([])

let bulletId = 0
let enemyId = 0
let explosionId = 0
let powerUpId = 0
let gameLoop = null
let enemySpawnTimer = null
let powerUpSpawnTimer = null
let lastShootTime = 0
const shootCooldown = 200

const GAME_WIDTH = 500
const GAME_HEIGHT = 600
const PLAYER_WIDTH = 40
const PLAYER_HEIGHT = 40

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  stopGame()
  document.removeEventListener('keydown', handleKeyDown)
})

function handleKeyDown(e) {
  if (e.code === 'Space' && gameRunning.value && !paused.value) {
    e.preventDefault()
    shoot()
  }
  if (e.code === 'KeyP' && gameRunning.value) {
    togglePause()
  }
}

function handleMouseMove(e) {
  if (!gameRunning.value || paused.value || gameOver.value) return
  const rect = gameArea.value.getBoundingClientRect()
  const x = e.clientX - rect.left - PLAYER_WIDTH / 2
  const y = e.clientY - rect.top - PLAYER_HEIGHT / 2
  playerX.value = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, x))
  playerY.value = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_HEIGHT, y))
}

function shoot() {
  if (!gameRunning.value || paused.value || gameOver.value) return
  const now = Date.now()
  if (now - lastShootTime < shootCooldown) return
  lastShootTime = now

  shooting.value = true
  setTimeout(() => { shooting.value = false }, 100)

  bullets.value.push({
    id: bulletId++,
    x: playerX.value + PLAYER_WIDTH / 2 - 2,
    y: playerY.value - 10,
    speed: 8
  })
}

function startGame() {
  score.value = 0
  lives.value = 3
  level.value = 1
  playerX.value = GAME_WIDTH / 2 - PLAYER_WIDTH / 2
  playerY.value = GAME_HEIGHT - 80
  bullets.value = []
  enemies.value = []
  explosions.value = []
  powerUps.value = []
  gameOver.value = false
  paused.value = false
  gameRunning.value = true

  if (gameLoop) clearInterval(gameLoop)
  if (enemySpawnTimer) clearInterval(enemySpawnTimer)
  if (powerUpSpawnTimer) clearInterval(powerUpSpawnTimer)

  gameLoop = setInterval(updateGame, 16)
  enemySpawnTimer = setInterval(spawnEnemy, 1000)
  powerUpSpawnTimer = setInterval(spawnPowerUp, 8000)
}

function stopGame() {
  gameRunning.value = false
  if (gameLoop) clearInterval(gameLoop)
  if (enemySpawnTimer) clearInterval(enemySpawnTimer)
  if (powerUpSpawnTimer) clearInterval(powerUpSpawnTimer)
}

function togglePause() {
  paused.value = !paused.value
}

function updateGame() {
  if (paused.value || gameOver.value) return

  // 更新子弹
  bullets.value = bullets.value.filter(b => {
    b.y -= b.speed
    return b.y > -20
  })

  // 更新敌机
  enemies.value = enemies.value.filter(e => {
    e.y += e.speed
    return e.y < GAME_HEIGHT + 50
  })

  // 更新道具
  powerUps.value = powerUps.value.filter(p => {
    p.y += 2
    return p.y < GAME_HEIGHT + 50
  })

  // 更新爆炸
  explosions.value = explosions.value.filter(e => {
    e.timer--
    return e.timer > 0
  })

  // 子弹与敌机碰撞
  bullets.value = bullets.value.filter(bullet => {
    let hit = false
    enemies.value = enemies.value.filter(enemy => {
      if (hit) return true
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + 4 > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + 10 > enemy.y
      ) {
        enemy.hp--
        if (enemy.hp <= 0) {
          score.value += enemy.score
          explosions.value.push({
            id: explosionId++,
            x: enemy.x + enemy.width / 2 - 15,
            y: enemy.y + enemy.height / 2 - 15,
            timer: 20
          })
          checkLevelUp()
          return false
        }
        hit = true
        return true
      }
      return true
    })
    return !hit
  })

  // 敌机与玩家碰撞
  enemies.value = enemies.value.filter(enemy => {
    if (
      playerX.value < enemy.x + enemy.width &&
      playerX.value + PLAYER_WIDTH > enemy.x &&
      playerY.value < enemy.y + enemy.height &&
      playerY.value + PLAYER_HEIGHT > enemy.y
    ) {
      explosions.value.push({
        id: explosionId++,
        x: enemy.x + enemy.width / 2 - 15,
        y: enemy.y + enemy.height / 2 - 15,
        timer: 20
      })
      loseLife()
      return false
    }
    return true
  })

  // 道具与玩家碰撞
  powerUps.value = powerUps.value.filter(p => {
    if (
      playerX.value < p.x + 30 &&
      playerX.value + PLAYER_WIDTH > p.x &&
      playerY.value < p.y + 30 &&
      playerY.value + PLAYER_HEIGHT > p.y
    ) {
      applyPowerUp(p.type)
      return false
    }
    return true
  })
}

function spawnEnemy() {
  if (paused.value || gameOver.value) return

  const rand = Math.random()
  let enemy

  if (rand < 0.6) {
    // 小型敌机
    enemy = {
      id: enemyId++,
      x: Math.random() * (GAME_WIDTH - 30),
      y: -40,
      width: 30,
      height: 30,
      speed: 2 + Math.random() * 2,
      hp: 1,
      maxHp: 1,
      score: 10,
      type: 'small',
      icon: '🛸'
    }
  } else if (rand < 0.9) {
    // 中型敌机
    enemy = {
      id: enemyId++,
      x: Math.random() * (GAME_WIDTH - 40),
      y: -50,
      width: 40,
      height: 40,
      speed: 1.5 + Math.random(),
      hp: 3,
      maxHp: 3,
      score: 30,
      type: 'medium',
      icon: '🚀'
    }
  } else {
    // 大型敌机
    enemy = {
      id: enemyId++,
      x: Math.random() * (GAME_WIDTH - 50),
      y: -60,
      width: 50,
      height: 50,
      speed: 1 + Math.random(),
      hp: 5,
      maxHp: 5,
      score: 50,
      type: 'large',
      icon: '🛸'
    }
  }

  enemies.value.push(enemy)
}

function spawnPowerUp() {
  if (paused.value || gameOver.value) return

  const types = [
    { type: 'health', icon: '❤️' },
    { type: 'double', icon: '⚡' },
    { type: 'shield', icon: '🛡️' }
  ]

  const powerUp = types[Math.floor(Math.random() * types.length)]

  powerUps.value.push({
    id: powerUpId++,
    x: Math.random() * (GAME_WIDTH - 30),
    y: -30,
    ...powerUp
  })
}

function applyPowerUp(type) {
  switch (type) {
    case 'health':
      lives.value = Math.min(lives.value + 1, 5)
      break
    case 'double':
      // 双倍火力效果（暂时提高射速）
      break
    case 'shield':
      // 护盾效果
      break
  }
}

function loseLife() {
  lives.value--
  if (lives.value <= 0) {
    gameOver.value = true
    stopGame()
  }
}

function checkLevelUp() {
  const newLevel = Math.floor(score.value / 100) + 1
  if (newLevel > level.value) {
    level.value = newLevel
    // 增加敌机生成频率
    if (enemySpawnTimer) clearInterval(enemySpawnTimer)
    const spawnRate = Math.max(300, 1000 - (level.value - 1) * 100)
    enemySpawnTimer = setInterval(spawnEnemy, spawnRate)
  }
}
</script>

<style lang="scss" scoped>
.plane-war-page {
  height: 100vh;
  background: #0a0a1a;
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
  gap: 20px;
  padding: 20px;
}

.game-area {
  position: relative;
  width: 500px;
  height: 600px;
  background: linear-gradient(to bottom, #0a0a2e, #1a1a3e);
  border: 2px solid rgba(102,126,234,0.3);
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
}

.stars {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 50%;
  animation: twinkle 3s infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.player-plane {
  position: absolute;
  width: 40px;
  height: 40px;
  transition: left 0.05s, top 0.05s;
  z-index: 10;

  .plane-body {
    font-size: 32px;
    filter: drop-shadow(0 0 8px rgba(102,126,234,0.8));
  }

  .shoot-effect {
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 10px;
    background: #f59e0b;
    border-radius: 2px;
    animation: shoot 0.1s ease-out;
  }
}

@keyframes shoot {
  from { height: 20px; opacity: 1; }
  to { height: 5px; opacity: 0; }
}

.bullet {
  position: absolute;
  width: 4px;
  height: 10px;
  background: linear-gradient(to bottom, #f59e0b, #f97316);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(245,158,11,0.6);
  z-index: 5;
}

.enemy {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;

  .enemy-icon {
    font-size: 24px;
    filter: drop-shadow(0 0 4px rgba(239,68,68,0.6));
  }

  .enemy-health {
    width: 80%;
    height: 3px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
    margin-top: 2px;

    .health-bar {
      height: 100%;
      background: linear-gradient(to right, #ef4444, #f59e0b);
      border-radius: 2px;
      transition: width 0.2s;
    }
  }

  &.small .enemy-icon { font-size: 20px; }
  &.medium .enemy-icon { font-size: 28px; }
  &.large .enemy-icon { font-size: 36px; }
}

.explosion {
  position: absolute;
  font-size: 30px;
  z-index: 15;
  animation: explode 0.3s ease-out forwards;
}

@keyframes explode {
  from { transform: scale(0.5); opacity: 1; }
  to { transform: scale(1.5); opacity: 0; }
}

.power-up {
  position: absolute;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  z-index: 8;
  animation: float 2s infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
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
  background: rgba(0,0,0,0.8);
  z-index: 20;
}

.game-over-content, .start-content {
  text-align: center;
  padding: 30px;
  background: #16213e;
  border-radius: 12px;
  border: 1px solid rgba(102,126,234,0.3);

  h2 {
    font-size: 28px;
    margin-bottom: 16px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: #a1a1aa;
    margin-bottom: 12px;
    font-size: 16px;
  }
}

.pause-text {
  font-size: 32px;
  color: #a1a1aa;
}

.side-info {
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
}

.enemy-list, .powerup-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enemy-item, .powerup-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #a1a1aa;
}
</style>
