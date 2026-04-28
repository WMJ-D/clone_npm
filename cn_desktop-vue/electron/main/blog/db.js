const mysql = require('mysql')

// 数据库配置
let dbConfig = {
  connectionLimit: 10,
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  port: '3306',
  database: 'mynewblog',
}

// 创建连接池
let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// 更新数据库配置
function updateConfig(newConfig) {
  dbConfig = { ...dbConfig, ...newConfig }
  // 重新创建连接池
  if (pool) {
    pool.end()
    pool = null
  }
}
// 执行SQL查询
function query(sql, params) {
  console.log("🚀 ~ query ~ sql:", sql)
  if(!sql) return
  return new Promise((resolve, reject) => {
    const connection = getPool()
    connection.getConnection((err, conn) => {
      if (err) {
        reject(err)
        return
      }
      conn.query(sql, params, (err, result) => {
        conn.release()
        if (err) {
          reject(err)
          return
        }
        resolve(result)
      })
    })
  })
}

// 测试数据库连接
async function testConnection() {
  try {
    await query('SELECT * from user')
    console.log('200');
    return { success: true, message: '数据库连接成功' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

module.exports = {
  query,
  updateConfig,
  testConnection,
  getConfig: () => ({ ...dbConfig }),
}