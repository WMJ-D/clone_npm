const express = require('express')
const router = express.Router()
const { query } = require('../db')

// 发布评论接口
router.post('/publish', async (req, res, next) => {
  let { content, article_id } = req.body
  let { username } = req.user

  try {
    let user = await query('select id,head_img,nickname from user where username = ?', [username])
    let { id: user_id, head_img, nickname } = user[0]
    let sql = 'insert into comment(user_id,article_id,cmcontent,nickname,head_img,create_time) values(?,?,?,?,?,NOW())'
    await query(sql, [user_id, article_id, content, nickname, head_img])
    res.send({ code: 0, msg: '发表成功', data: null })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取评论列表接口
router.get('/list', async (req, res, next) => {
  let { article_id } = req.query
  try {
    let sql = 'select id,head_img,nickname,cmcontent,DATE_FORMAT(create_time,"%Y-%m-%d %H:%i:%s") AS create_time from comment where article_id = ?'
    let result = await query(sql, [article_id])
    res.send({ code: 0, msg: '成功', data: result })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 删除评论接口
router.post('/delete', async (req, res, next) => {
  let { comment_id } = req.body
  try {
    let sql = 'delete from comment where id = ?'
    await query(sql, [comment_id])
    res.send({ code: 0, msg: '删除成功', data: null })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

module.exports = router