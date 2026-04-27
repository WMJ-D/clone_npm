import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Config', component: () => import('../views/ConfigPage.vue') },
  { path: '/ai-models', name: 'AIModels', component: () => import('../views/AIModelsPage.vue') },
  { path: '/ai-chat', name: 'AIChat', component: () => import('../views/AIChatPage.vue') },
  { path: '/iframe-page', name: 'IframePage', component: () => import('../views/IframePage.vue') },
  { path: '/gomoku', name: 'Gomoku', component: () => import('../views/games/GomokuPage.vue') },
  { path: '/plane-war', name: 'PlaneWar', component: () => import('../views/games/PlaneWarPage.vue') },
  { path: '/tetris', name: 'Tetris', component: () => import('../views/games/TetrisPage.vue') },
  { path: '/snake', name: 'Snake', component: () => import('../views/games/SnakePage.vue') },
  { path: '/sokoban', name: 'Sokoban', component: () => import('../views/games/SokobanPage.vue') },
  { path: '/api-tester', name: 'ApiTester', component: () => import('../views/tools/ApiTesterPage.vue') },
  { path: '/json-formatter', name: 'JsonFormatter', component: () => import('../views/tools/JsonFormatterPage.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
