const express = require('express')
const cors = require('cors')
const path = require('path')
const { PRIVATE_KEY } = require('./blog/utils')
const { testConnection } = require('./blog/db')

// 导入路由
const articleRouter = require('./blog/routes/article')
const usersRouter = require('./blog/routes/users')
const commentRouter = require('./blog/routes/comment')
const  {expressjwt}  = require('express-jwt')
console.log("🚀 ~ expressJWT:", expressjwt)

let app = null
let server = null
let currentPort = 3001

// 创建Express应用
function createApp() {
  if (app) return app

  app = express()

  // 配置中间件
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  // 静态文件目录（上传的图片）
  app.use('/public', express.static(path.join(__dirname, 'uploads')))

  // JWT验证中间件 - 使用正则表达式匹配路径
  app.use(
    expressjwt({
      secret: PRIVATE_KEY,
      algorithms: ['HS256'],
    }).unless({
      path: [
        /^\/$/,
        /^\/api\/article\/detail/,
        /^\/api\/users\/login/,
        /^\/api\/users\/register/,
        /^\/api\/article\/allList/,
        /^\/api\/article\/classify/,
        /^\/api\/article\/list\/Singleclassify/,
        /^\/api\/article\/upload/,
        /^\/api\/comment\/list/,
        /^\/api\/article\/typeList/,
      ],
    })
  )

  // 根路由 - 测试服务器
  app.get('/', (req, res) => {
    res.send({ code: 0, msg: '博客服务运行中', version: '1.0.0' })
  })

  // 路由
  app.use('/api/article', articleRouter)
  app.use('/api/users', usersRouter)
  app.use('/api/comment', commentRouter)

  // 404处理
  app.use((req, res) => {
    console.log(`[Blog] 404 Not Found: ${req.method} ${req.path}`)
    res.status(404).send({ code: -1, msg: `接口不存在: ${req.method} ${req.path}` })
  })

  // 错误处理
  app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
      res.status(401).send({ code: -1, msg: 'token验证失败' })
    } else {
      console.error('[Blog] Error:', err)
      res.status(err.status || 500).send({ code: -1, msg: err.message || '服务器错误' })
    }
  })

  return app
}

// 启动博客服务器
async function startBlogServer(port = 3001) {
  return new Promise(async (resolve, reject) => {
    try {
      // 测试数据库连接
      const dbStatus = await testConnection()
      if (!dbStatus.success) {
        console.warn('[Blog] 数据库连接失败:', dbStatus.message)
        resolve({ success: false, message: '数据库连接失败: ' + dbStatus.message, port: null })
        return
      }

      // 创建应用
      const blogApp = createApp()

      // 如果服务器已经在运行，先关闭
      if (server) {
        server.close()
      }

      currentPort = port
      server = blogApp.listen(port, '127.0.0.1', () => {
        console.log(`[Blog] 博客服务已启动: http://127.0.0.1:${port}`)
        resolve({ success: true, message: '博客服务启动成功', port })
      })

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Blog] 端口 ${port} 已被占用，尝试使用 ${port + 1}`)
          startBlogServer(port + 1).then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })
    } catch (error) {
      reject(error)
    }
  })
}

// 停止博客服务器
function stopBlogServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Blog] 博客服务已停止')
        server = null
        app = null
        resolve({ success: true, message: '博客服务已停止' })
      })
    } else {
      resolve({ success: true, message: '博客服务未运行' })
    }
  })
}

// 获取博客服务器状态
function getBlogServerStatus() {
  return {
    running: !!server,
    port: currentPort,
    url: server ? `http://127.0.0.1:${currentPort}` : null,
  }
}

startBlogServer()

module.exports = {
  startBlogServer,
  stopBlogServer,
  getBlogServerStatus,
}