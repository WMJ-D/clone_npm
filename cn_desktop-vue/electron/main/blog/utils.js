const crypto = require('crypto')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

// 密码加密
function md5(s) {
  return crypto.createHash('md5').update(String(s)).digest('hex')
}

// JWT密钥和过期时间
const PWD_SALT = 'xd_node'
const PRIVATE_KEY = 'xd_blog'
const EXPIRESD = 60 * 60 * 24

// 文件上传配置
let upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      let date = new Date()
      let year = date.getFullYear()
      let month = (date.getMonth() + 1).toString().padStart(2, '0')
      let day = date.getDate()
      let dir = path.join(__dirname, '../uploads/' + year + month + day)

      // 判断目录是否存在，没有则创建
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      cb(null, dir)
    },
    filename: function (req, file, cb) {
      let fileName = Date.now() + path.extname(file.originalname)
      cb(null, fileName)
    },
  }),
})

module.exports = {
  md5,
  upload,
  PWD_SALT,
  PRIVATE_KEY,
  EXPIRESD,
}