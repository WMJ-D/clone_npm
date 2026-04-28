<template>
  <div class="edit-page">
    <!-- 头部 -->
    <header class="page-header">
      <div class="header-content">
        <button @click="goBack" class="btn-back">← 返回</button>
        <h1 class="page-title">{{ isNew ? '写文章' : '编辑文章' }}</h1>
        <div class="header-right">
          <button @click="handleSave" class="btn-save" :disabled="saving">
            {{ saving ? '保存中...' : '保存文章' }}
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="edit-main">
      <div class="edit-form">
        <!-- 标题 -->
        <div class="form-group">
          <input v-model="form.title" type="text" placeholder="请输入文章标题" class="title-input" />
        </div>

        <!-- 分类 -->
        <div class="form-group">
          <label>文章分类</label>
          <div class="classify-inputs">
            <input v-model="form.classname01" type="text" placeholder="分类1" />
            <input v-model="form.classname02" type="text" placeholder="分类2（可选）" />
            <input v-model="form.classname03" type="text" placeholder="分类3（可选）" />
          </div>
        </div>

        <!-- 封面 -->
        <div class="form-group">
          <label>封面图片</label>
          <div class="cover-input">
            <input v-model="form.pic_url" type="text" placeholder="输入图片URL或上传" />
            <button @click="triggerUpload" type="button" class="btn-upload">上传</button>
            <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleUpload" />
          </div>
          <div v-if="form.pic_url" class="cover-preview">
            <img :src="getCoverUrl(form.pic_url)" />
          </div>
        </div>

        <!-- 内容编辑器 -->
        <div class="form-group">
          <label>文章内容（Markdown）</label>
          <div class="editor-container">
            <div class="editor-toolbar">
              <button @click="insertMarkdown('**', '**')" title="粗体">B</button>
              <button @click="insertMarkdown('*', '*')" title="斜体">I</button>
              <button @click="insertMarkdown('~~', '~~')" title="删除线">S</button>
              <button @click="insertMarkdown('# ', '')" title="标题">H</button>
              <button @click="insertMarkdown('- ', '')" title="列表">L</button>
              <button @click="insertMarkdown('1. ', '')" title="有序列表">OL</button>
              <button @click="insertMarkdown('> ', '')" title="引用">Q</button>
              <button @click="insertMarkdown('```\n', '\n```')" title="代码块">C</button>
              <button @click="insertMarkdown('[', '](url)')" title="链接">🔗</button>
              <button @click="insertMarkdown('![alt](', ')')" title="图片">🖼</button>
            </div>
            <textarea
              ref="editorRef"
              v-model="form.content"
              placeholder="请输入文章内容（支持Markdown语法）"
              class="editor-textarea"
            ></textarea>
          </div>
        </div>

        <!-- 预览 -->
        <div class="form-group">
          <label>预览</label>
          <div class="preview markdown-body" v-html="renderedContent"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlogStore } from '../../stores/blog'
import { marked } from 'marked'

const router = useRouter()
const route = useRoute()
const blogStore = useBlogStore()

const saving = ref(false)
const editorRef = ref(null)
const fileInput = ref(null)

const articleId = computed(() => route.params.id)
const isNew = computed(() => articleId.value === 'new')

const form = reactive({
  title: '',
  content: '',
  classname01: '',
  classname02: '',
  classname03: '',
  pic_url: '',
  classid_01: null,
  classid_02: null,
  classid_03: null,
})

// 渲染markdown预览
const renderedContent = computed(() => {
  if (!form.content) return '<p style="color: #8b949e;">暂无内容</p>'
  return marked(form.content)
})

// 获取封面URL
function getCoverUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return blogStore.getBaseUrl() + url
}

// 插入Markdown标记
function insertMarkdown(prefix, suffix) {
  const textarea = editorRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = form.content.substring(start, end)
  const replacement = prefix + (selectedText || '文本') + suffix

  form.content = form.content.substring(0, start) + replacement + form.content.substring(end)

  // 设置光标位置
  setTimeout(() => {
    textarea.focus()
    const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 2)
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)
}

// 触发文件上传
function triggerUpload() {
  fileInput.value?.click()
}

// 处理文件上传
async function handleUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const result = await blogStore.uploadImage(file)
    if (result.code === 0) {
      form.pic_url = result.data
      window.__toast?.('图片上传成功', 'success')
    } else {
      window.__toast?.(result.msg, 'error')
    }
  } catch (error) {
    window.__toast?.('上传失败: ' + error.message, 'error')
  }

  // 清空input
  event.target.value = ''
}

// 加载文章
async function loadArticle() {
  if (isNew.value) return

  try {
    const result = await blogStore.getArticleDetail(articleId.value)
    if (result.code === 0) {
      const article = result.data
      form.title = article.title
      form.content = article.content
      form.classname01 = article.class_name01 || ''
      form.classname02 = article.class_name02 || ''
      form.classname03 = article.class_name03 || ''
      form.pic_url = article.pic_url || ''
      form.classid_01 = article.classify_id01
      form.classid_02 = article.classify_id02
      form.classid_03 = article.classify_id03
    } else {
      window.__toast?.('文章不存在', 'error')
      router.push('/blog/personal')
    }
  } catch (error) {
    window.__toast?.('加载文章失败: ' + error.message, 'error')
  }
}

// 保存文章
async function handleSave() {
  if (!form.title.trim()) {
    window.__toast?.('请输入文章标题', 'warning')
    return
  }

  if (!form.content.trim()) {
    window.__toast?.('请输入文章内容', 'warning')
    return
  }

  saving.value = true
  try {
    let result
    if (isNew.value) {
      result = await blogStore.addArticle({
        title: form.title,
        content: form.content,
        classname01: form.classname01 || null,
        classname02: form.classname02 || null,
        classname03: form.classname03 || null,
        pic_url: form.pic_url || null,
        type: 0,
      })
    } else {
      result = await blogStore.updateArticle({
        article_id: articleId.value,
        title: form.title,
        content: form.content,
        classname01: form.classname01 || null,
        classname02: form.classname02 || null,
        classname03: form.classname03 || null,
        pic_url: form.pic_url || null,
        classid_01: form.classid_01,
        classid_02: form.classid_02,
        classid_03: form.classid_03,
      })
    }

    if (result.code === 0) {
      window.__toast?.(isNew.value ? '文章发布成功' : '文章更新成功', 'success')
      router.push('/blog/personal')
    } else {
      window.__toast?.(result.msg, 'error')
    }
  } catch (error) {
    window.__toast?.('保存失败: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/blog/personal')
}

onMounted(async () => {
  // 检查登录状态
  if (!blogStore.isLoggedIn) {
    router.push('/blog/login')
    return
  }

  await loadArticle()
})
</script>

<style lang="scss" scoped>
.edit-page {
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: #0d1117;
  color: #e6edf3;
}

.page-header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    height: 60px;
    gap: 20px;
  }

  .btn-back {
    background: transparent;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 16px;
    color: #e6edf3;
    cursor: pointer;

    &:hover {
      background: #21262d;
    }
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .header-right {
    margin-left: auto;
  }

  .btn-save {
    background: #238636;
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    color: #fff;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: #2ea043;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.edit-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 30px 20px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: #e6edf3;
  }
}

.title-input {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px 20px;
  color: #e6edf3;
  font-size: 24px;
  font-weight: 600;

  &:focus {
    outline: none;
    border-color: #58a6ff;
  }

  &::placeholder {
    color: #484f58;
  }
}

.classify-inputs {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 10px 12px;
    color: #e6edf3;

    &:focus {
      outline: none;
      border-color: #58a6ff;
    }

    &::placeholder {
      color: #484f58;
    }
  }
}

.cover-input {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 10px 12px;
    color: #e6edf3;

    &:focus {
      outline: none;
      border-color: #58a6ff;
    }
  }

  .btn-upload {
    background: #1f6feb;
    border: none;
    border-radius: 6px;
    padding: 10px 16px;
    color: #fff;
    cursor: pointer;

    &:hover {
      background: #388bfd;
    }
  }
}

.cover-preview {
  margin-top: 10px;

  img {
    max-width: 300px;
    max-height: 200px;
    border-radius: 6px;
    object-fit: cover;
  }
}

.editor-container {
  border: 1px solid #30363d;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  gap: 2px;
  padding: 8px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  flex-wrap: wrap;

  button {
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 6px 10px;
    color: #e6edf3;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;

    &:hover {
      background: #30363d;
    }
  }
}

.editor-textarea {
  width: 100%;
  min-height: 400px;
  background: #0d1117;
  border: none;
  padding: 16px;
  color: #e6edf3;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #484f58;
  }
}

.preview {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 20px;
  min-height: 200px;
  line-height: 1.8;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 20px;
    margin-bottom: 10px;
    font-weight: 600;
  }

  :deep(p) {
    margin-bottom: 12px;
  }

  :deep(code) {
    background: #0d1117;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 90%;
  }

  :deep(pre) {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    margin-bottom: 12px;

    code {
      background: transparent;
      padding: 0;
    }
  }

  :deep(blockquote) {
    border-left: 4px solid #30363d;
    padding: 0 12px;
    color: #8b949e;
    margin-bottom: 12px;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  :deep(a) {
    color: #58a6ff;
  }

  :deep(ul), :deep(ol) {
    padding-left: 2em;
    margin-bottom: 12px;
  }
}
</style>