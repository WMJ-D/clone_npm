const express = require('express')
const router = express.Router()
const { query } = require('../db')
const { upload } = require('../utils')

const addressPort = `/public`

// 新增博客接口
router.post('/add', async (req, res, next) => {
  let { title, content, classname01, classname02, classname03, type, pic_url } = req.body
  let { username } = req.user

  try {
    let result = await query('select id from user where username = ?', [username])
    let user_id = result[0].id

    // 处理分类
    async function processClassify(classname) {
      if (!classname) return { cid: null, className: null }
      
      let existing = await query('select classify_id from classify where classname = ?', [classname])
      if (!existing || existing.length === 0) {
        await query('insert into classify(classname)values(?)', [classname])
        let newClass = await query('select classify_id from classify where classname = ?', [classname])
        return { cid: newClass[0].classify_id, className: classname }
      } else {
        return { cid: existing[0].classify_id, className: classname }
      }
    }

    let class1 = await processClassify(classname01)
    let class2 = await processClassify(classname02)
    let class3 = await processClassify(classname03)

    type = type ? type : 0

    await query(
      `insert into article(title,content,user_id,
      classify_id01,classify_id02,classify_id03,
      class_name01,class_name02,class_name03,
      type,pic_url,
      create_time)values(?,?,?,?,?,?,?,?,?,?,?,localtime)`,
      [title, content, user_id, class1.cid, class2.cid, class3.cid, class1.className, class2.className, class3.className, type, pic_url]
    )

    res.send({ code: 0, msg: '新增成功', data: null })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 上传封面或头像接口
router.post('/upload', upload.single('head_img'), async (req, res, next) => {
  console.log(req.file)
  let imgPath = req.file.path.split('public')[1]
  let imgUrl = addressPort + imgPath.replace('\\', '/')
  res.send({ code: 0, msg: '上传成功', data: imgUrl })
})

// 获取博客列表接口
router.get('/typeList', async (req, res, next) => {
  try {
    let { curPage, pageSize, type } = req.query
    console.log("🚀 ~  req.query:",  req.query)

    if (curPage && pageSize) {
      if (type==0) {
        var start = (curPage - 1) * pageSize
        var numsql = 'select * from article where type = 0'
        var sql =
          `SELECT id,title,content,
          class_name01,class_name02,class_name03,type,pic_url,like_count,
          DATE_FORMAT(create_time,"%Y-%m-%d %H:%i:%s") AS create_time FROM article where type = 0 and  title like '%${req.query.search ? req.query.search : ''}%' ORDER BY create_time DESC limit ` +
          start +
          ',' +
          pageSize
        var coust = await query(numsql)
        coust = coust.length
      }
    } else {
      if (type == 1) {
        var sql =
          `select id,title,content,
          class_name01,class_name02,class_name03,type,pic_url,like_count,
          DATE_FORMAT(create_time,"%Y-%m-%d %H:%i:%s") AS create_time from article where type =` + type
      } else {
        var sql = `select id,title,content,
          class_name01,class_name02,class_name03,type,pic_url,like_count,
          DATE_FORMAT(create_time,"%Y-%m-%d %H:%i:%s") AS create_time from article where type = 0 ORDER BY create_time DESC`
      }
    }

    let result = await query(sql)
    res.send({ code: 0, msg: '获取成功', data: result, coust })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取单篇博客分类列表接口
router.get('/classify/single', async (req, res, next) => {
  try {
    let { classify_id01, classify_id02, classify_id03 } = req.body
    let sql = 'select classname from classify where classify_id = ?'
    let classname01 = await query(sql, [classify_id01])
    let classname02 = await query(sql, [classify_id02])
    let classname03 = await query(sql, [classify_id03])
    res.send({ code: 0, msg: '获取单篇博客分类成功', data: { classname01, classname02, classname03 } })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取单个分类的文章列表接口
router.get('/list/Singleclassify', async (req, res, next) => {
  try {
    let { classname } = req.query
    let sql = `select pic_url,id,title,content,create_time,
    classify_id01,class_name01,
    classify_id02,class_name02,
    classify_id03,class_name03 from article where class_name01 = ? OR class_name02 = ?  OR class_name03 = ? `
    let list = await query(sql, [classname, classname, classname])
    res.send({ code: 0, msg: '获取单个标签分类成功', data: { list } })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 删除博客接口
router.post('/delete', async (req, res, next) => {
  let { article_id } = req.body
  let { username } = req.user
  try {
    let userSql = 'select id from user where username = ?'
    let user = await query(userSql, [username])
    let user_id = user[0].id
    let sql = 'delete from article where id = ? and user_id = ?'
    await query(sql, [article_id, user_id])
    res.send({ code: 0, msg: '删除成功', data: null })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取全部博客分类接口
router.get('/classify', async (req, res, next) => {
  try {
    let sql = 'select classify_id,classname from classify'
    let result = await query(sql)
    res.send({ code: 0, msg: '获取博客分类成功', data: result })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取博客详情接口
router.get('/detail', async (req, res, next) => {
  let article_id = req.query.article_id
  try {
    let sql = `select id,title,content,
    class_name01,classify_id01,
    class_name02,classify_id02,
    class_name03,classify_id03,
    visited,like_count,pic_url,
    DATE_FORMAT(create_time,"%Y-%m-%d%H:%i:%s") AS create_time from article where id = ?`
    let result = await query(sql, [article_id])
    let visited = result[0].visited + 1
    await query('update article set visited = ? where id = ?', [visited, article_id])
    res.send({ code: 0, msg: '获取成功', data: result[0] })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 获取管理员的全部博客列表接口
router.get('/myList', async (req, res, next) => {
  let { username } = req.user
  let a = (req.query.page - 1) * req.query.size
  let b = req.query.size
  try {
    let userSql = 'select id from user where username = ?'
    let user = await query(userSql, [username])
    let user_id = user[0].id
    let sql =
      `select id,title,content,DATE_FORMAT(create_time,"%Y-%m-%d%H:%i:%s") AS create_time from article where user_id = ? and  title like '%${req.query.search}%' ORDER BY create_time DESC limit ${a},${b}`
    let result = await query(sql, [user_id])
    let sqltoal =
      `select id,title,content,DATE_FORMAT(create_time,"%Y-%m-%d%H:%i:%s") AS create_time from article where user_id = ? and  title like '%${req.query.search}%' ORDER BY create_time DESC`
    let resultTotal = await query(sqltoal, [user_id])

    res.send({ code: 0, msg: '获取成功', data: { list: result, total: resultTotal.length } })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 点赞文章接口
router.post('/like', async (req, res, next) => {
  let { article_id } = req.body
  let { username } = req.user
  try {
    let sql = 'select like_count from article where id = ? '
    let result = await query(sql, [article_id])
    let newlikeCount = result[0].like_count + 1

    let likesql = 'update article set like_count = ? where id = ?'
    await query(likesql, [newlikeCount, article_id])

    let likeres = await query('select like_count from article where id = ?', [article_id])

    res.send({ code: 0, msg: '点赞成功', data: likeres })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

// 更新文章接口
router.post('/update', async (req, res, next) => {
  let {
    article_id,
    title,
    content,
    classname01,
    classname02,
    classname03,
    classid_01,
    classid_02,
    classid_03,
    pic_url,
  } = req.body

  try {
    let sql =
      'update article set title = ?,content = ?,class_name01 = ?,class_name02 = ?,class_name03 = ?,pic_url = ? where id = ?'
    await query(sql, [title, content, classname01, classname02, classname03, pic_url, article_id])

    if ((await query('select classname from classify where classname = ?', [classname01])) == false) {
      let sql2 = 'update classify set classname = ? where classify_id = ?'
      await query(sql2, [classname01, classid_01])
    }

    if ((await query('select classname from classify where classname = ?', [classname02])) == false) {
      let sql3 = 'update classify set classname = ? where classify_id = ?'
      await query(sql3, [classname02, classid_02])
    }

    if ((await query('select classname from classify where classname = ?', [classname03])) == false) {
      let sql4 = 'update classify set classname = ? where classify_id = ?'
      await query(sql4, [classname03, classid_03])
    }
    res.send({ code: 0, msg: '更新成功', data: null })
  } catch (e) {
    console.log(e)
    next(e)
  }
})

module.exports = router