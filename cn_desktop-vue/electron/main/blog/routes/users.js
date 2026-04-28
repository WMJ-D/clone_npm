const express = require('express')
const router = express.Router()
const { query } = require('../db')
const { PWD_SALT, PRIVATE_KEY, EXPIRESD, md5 } = require('../utils')
const jwt = require('jsonwebtoken')

// 注册接口
router.post('/register', async (req, res, next) => {
  let { username, password, nickname } = req.body
  try {
    let user = await query('select * from user where username = ? OR nickname = ?', [username, nickname])
    if (!user || user.length === 0) {
      password = md5(`${password}${PWD_SALT}`)
      await query('insert into user(username,password,nickname) value(?,?,?)', [username, password, nickname])
      res.send({ code: 0, msg: '注册成功！' })
    } else {
      res.send({ code: -1, msg: '账号已存在，请重新注册！' })
    }
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 登录接口
router.post('/login', async (req, res, next) => {
  let username = req.body.name
  let password = req.body.password
  try {
    let user = await query('select * from user where username = ?', [username])
    if (!user || user.length === 0) {
      res.send({ code: -1, msg: '该账号不存在' })
    } else {
      password = md5(`${password}${PWD_SALT}`)
      let result = await query('select * from user where username = ? and password = ?', [username, password])
      if (!result || result.length === 0) {
        res.send({ code: -1, msg: '账号或密码不正确' })
      } else {
        let token = jwt.sign({ username }, PRIVATE_KEY, { expiresIn: EXPIRESD })
        res.send({ code: 0, msg: '登录成功', token: token })
      }
    }
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取用户信息
router.get('/info', async (req, res, next) => {
  let { username } = req.user
  try {
    let userinfo = await query('select nickname,head_img from user where username = ?', [username])
    res.send({ code: 0, msg: '成功', data: userinfo[0] })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 用户信息更新接口
router.post('/updateUser', async (req, res, next) => {
  let { nickname, head_img } = req.body
  let { username } = req.user

  let userinfo = await query('select id from user where username = ?', [username])
  let user_id = userinfo[0].id
  try {
    await query('update user set nickname = ?,head_img = ? where username = ?', [nickname, head_img, username])
    await query('update comment set nickname = ?,head_img = ? where user_id = ?', [nickname, head_img, user_id])
    res.send({ code: 0, msg: '更新成功', data: null })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

module.exports = router