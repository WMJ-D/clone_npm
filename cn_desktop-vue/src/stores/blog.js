import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBlogStore = defineStore('blog', () => {
  // 用户状态
  const token = ref(localStorage.getItem('blog_token') || '')
  const userInfo = ref(null)
  const isLoggedIn = computed(() => !!token.value)

  // 博客服务器状态
  const serverStatus = ref({ running: false, port: null, url: null })

  // 文章列表
  const articles = ref([])
  const currentArticle = ref(null)
  const classifications = ref([])

  // 分页
  const pagination = ref({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  })

  // 设置token
  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('blog_token', newToken)
  }

  // 清除token
  function clearToken() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('blog_token')
  }

  // 获取API基础URL
  function getBaseUrl() {
    return serverStatus.value.url || 'http://127.0.0.1:3001'
  }

  // 通用请求方法
  async function request(url, options = {}) {
    const baseUrl = getBaseUrl()
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }

    try {
      const response = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (data.code === -1 && data.msg === 'token验证失败') {
        clearToken()
        throw new Error('登录已过期，请重新登录')
      }

      return data
    } catch (error) {
      console.error('请求失败:', error)
      throw error
    }
  }

  // 用户登录
  async function login(username, password) {
    const data = await request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ name: username, password }),
    })

    if (data.code === 0) {
      setToken(data.token)
      await getUserInfo()
    }

    return data
  }

  // 用户注册
  async function register(username, password, nickname) {
    return await request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, nickname }),
    })
  }

  // 获取用户信息
  async function getUserInfo() {
    if (!token.value) return null

    try {
      const data = await request('/api/users/info')
      if (data.code === 0) {
        userInfo.value = data.data
      }
      return data
    } catch (error) {
      return null
    }
  }

  // 更新用户信息
  async function updateUserInfo(nickname, head_img) {
    return await request('/api/users/updateUser', {
      method: 'POST',
      body: JSON.stringify({ nickname, head_img }),
    })
  }

  // 获取文章列表
  async function getArticleList(curPage, pageSize, type, search) {
    let url = `/api/article/typeList?curPage=${curPage}&pageSize=${pageSize}`
    if (type !== undefined) url += `&type=${type}`
    if (search) url += `&search=${encodeURIComponent(search)}`

    const data = await request(url)
    if (data.code === 0) {
      articles.value = data.data
      pagination.value.total = data.coust || data.data.length
    }
    return data
  }

  // 获取文章详情
  async function getArticleDetail(articleId) {
    const data = await request(`/api/article/detail?article_id=${articleId}`)
    if (data.code === 0) {
      currentArticle.value = data.data
    }
    return data
  }

  // 获取分类列表
  async function getClassifications() {
    const data = await request('/api/article/classify')
    if (data.code === 0) {
      classifications.value = data.data
    }
    return data
  }

  // 新增文章
  async function addArticle(articleData) {
    return await request('/api/article/add', {
      method: 'POST',
      body: JSON.stringify(articleData),
    })
  }

  // 更新文章
  async function updateArticle(articleData) {
    return await request('/api/article/update', {
      method: 'POST',
      body: JSON.stringify(articleData),
    })
  }

  // 删除文章
  async function deleteArticle(articleId) {
    return await request('/api/article/delete', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId }),
    })
  }

  // 点赞文章
  async function likeArticle(articleId) {
    return await request('/api/article/like', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId }),
    })
  }

  // 获取我的文章列表
  async function getMyArticles(page, size, search) {
    const data = await request(`/api/article/myList?page=${page}&size=${size}&search=${search || ''}`)
    return data
  }

  // 获取评论列表
  async function getComments(articleId) {
    return await request(`/api/comment/list?article_id=${articleId}`)
  }

  // 发表评论
  async function publishComment(articleId, content) {
    return await request('/api/comment/publish', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, content }),
    })
  }

  // 删除评论
  async function deleteComment(commentId) {
    return await request('/api/comment/delete', {
      method: 'POST',
      body: JSON.stringify({ comment_id: commentId }),
    })
  }

  // 上传图片
  async function uploadImage(file) {
    const baseUrl = getBaseUrl()
    const formData = new FormData()
    formData.append('head_img', file)

    try {
      const response = await fetch(`${baseUrl}/api/article/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
        },
        body: formData,
      })

      return await response.json()
    } catch (error) {
      console.error('上传失败:', error)
      throw error
    }
  }

  // 更新服务器状态
  async function updateServerStatus() {
    if (window.electronAPI && window.electronAPI.blogGetStatus) {
      const status = await window.electronAPI.blogGetStatus()
      serverStatus.value = status
    }
  }

  // 启动服务器
  async function startServer(port) {
    if (window.electronAPI && window.electronAPI.blogStart) {
      const result = await window.electronAPI.blogStart(port)
      await updateServerStatus()
      return result
    }
    return { success: false, message: 'Electron API 不可用' }
  }

  // 停止服务器
  async function stopServer() {
    if (window.electronAPI && window.electronAPI.blogStop) {
      const result = await window.electronAPI.blogStop()
      await updateServerStatus()
      return result
    }
    return { success: false, message: 'Electron API 不可用' }
  }

  // 测试数据库连接
  async function testDatabase() {
    if (window.electronAPI && window.electronAPI.blogTestDb) {
      return await window.electronAPI.blogTestDb()
    }
    return { success: false, message: 'Electron API 不可用' }
  }

  // 更新数据库配置
  async function updateDbConfig(config) {
    if (window.electronAPI && window.electronAPI.blogUpdateDbConfig) {
      return await window.electronAPI.blogUpdateDbConfig(config)
    }
    return { success: false, message: 'Electron API 不可用' }
  }

  return {
    // 状态
    token,
    userInfo,
    isLoggedIn,
    serverStatus,
    articles,
    currentArticle,
    classifications,
    pagination,

    // 方法
    setToken,
    clearToken,
    getBaseUrl,
    request,
    login,
    register,
    getUserInfo,
    updateUserInfo,
    getArticleList,
    getArticleDetail,
    getClassifications,
    addArticle,
    updateArticle,
    deleteArticle,
    likeArticle,
    getMyArticles,
    getComments,
    publishComment,
    deleteComment,
    uploadImage,
    updateServerStatus,
    startServer,
    stopServer,
    testDatabase,
    updateDbConfig,
  }
})