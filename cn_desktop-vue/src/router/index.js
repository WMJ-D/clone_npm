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
  { path: '/json-formatter', name: 'JsonFormatter', component: () => import('../views/tools/JsonFormatterPage.vue') },
  // 博客路由
  { path: '/blog', name: 'BlogHome', component: () => import('../views/blog/HomePage.vue') },
  { path: '/blog/login', name: 'BlogLogin', component: () => import('../views/blog/LoginPage.vue') },
  { path: '/blog/article/:id', name: 'BlogArticle', component: () => import('../views/blog/ArticlePage.vue') },
  { path: '/blog/edit/:id', name: 'BlogArticleEdit', component: () => import('../views/blog/ArticleEditPage.vue') },
  { path: '/blog/personal', name: 'BlogPersonal', component: () => import('../views/blog/PersonalPage.vue') },
  { path: '/blog/timeline', name: 'BlogTimeline', component: () => import('../views/blog/TimelinePage.vue') },
  { path: '/blog/about', name: 'BlogAbout', component: () => import('../views/blog/AboutPage.vue') },
  { path: '/blog/guestbook', name: 'BlogGuestbook', component: () => import('../views/blog/GuestbookPage.vue') },
  { path: '/blog/settings', name: 'BlogSettings', component: () => import('../views/blog/SettingsPage.vue') },
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
