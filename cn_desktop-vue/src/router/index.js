import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Config', component: () => import('../views/ConfigPage.vue') },
  { path: '/ai-models', name: 'AIModels', component: () => import('../views/AIModelsPage.vue') },
  { path: '/ai-chat', name: 'AIChat', component: () => import('../views/AIChatPage.vue') },
  { path: '/iframe-page', name: 'IframePage', component: () => import('../views/IframePage.vue') },
  { path: '/gomoku', name: 'Gomoku', component: () => import('../views/GomokuPage.vue') },
  { path: '/plane-war', name: 'PlaneWar', component: () => import('../views/PlaneWarPage.vue') },
  { path: '/tetris', name: 'Tetris', component: () => import('../views/TetrisPage.vue') },
  { path: '/snake', name: 'Snake', component: () => import('../views/SnakePage.vue') },
  { path: '/sokoban', name: 'Sokoban', component: () => import('../views/SokobanPage.vue') },
  { path: '/api-tester', name: 'ApiTester', component: () => import('../views/ApiTesterPage.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
