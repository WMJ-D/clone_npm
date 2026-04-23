import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Config', component: () => import('../views/ConfigPage.vue') },
  { path: '/ai-models', name: 'AIModels', component: () => import('../views/AIModelsPage.vue') },
  { path: '/ai-chat', name: 'AIChat', component: () => import('../views/AIChatPage.vue') },
  { path: '/iframe-page', name: 'IframePage', component: () => import('../views/IframePage.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
