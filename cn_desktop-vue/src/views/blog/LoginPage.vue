<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>{{ isRegister ? '注册账号' : '用户登录' }}</h1>
        <p>{{ isRegister ? '创建新账号' : '登录你的账号' }}</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" type="text" placeholder="请输入用户名" required />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" required />
        </div>

        <div class="form-group" v-if="isRegister">
          <label>昵称</label>
          <input v-model="form.nickname" type="text" placeholder="请输入昵称" required />
        </div>

        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? '处理中...' : (isRegister ? '注册' : '登录') }}
        </button>
      </form>

      <div class="login-footer">
        <a @click="toggleMode">
          {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
        </a>
        <a @click="goBack" class="back-link">返回首页</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '../../stores/blog'

const router = useRouter()
const blogStore = useBlogStore()

const isRegister = ref(false)
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  nickname: '',
})

function toggleMode() {
  isRegister.value = !isRegister.value
  form.username = ''
  form.password = ''
  form.nickname = ''
}

async function handleSubmit() {
  if (loading.value) return

  loading.value = true
  try {
    if (isRegister.value) {
      // 注册
      const result = await blogStore.register(form.username, form.password, form.nickname)
      if (result.code === 0) {
        window.__toast?.('注册成功，请登录', 'success')
        isRegister.value = false
      } else {
        window.__toast?.(result.msg, 'error')
      }
    } else {
      // 登录
      const result = await blogStore.login(form.username, form.password)
      if (result.code === 0) {
        window.__toast?.('登录成功', 'success')
        router.push('/blog')
      } else {
        window.__toast?.(result.msg, 'error')
      }
    }
  } catch (error) {
    window.__toast?.(error.message || '操作失败', 'error')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/blog')
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: #0d1117;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    font-size: 24px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 8px;
  }

  p {
    color: #8b949e;
    font-size: 14px;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 500;
    color: #e6edf3;
  }

  input {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 12px 16px;
    color: #e6edf3;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #58a6ff;
    }

    &::placeholder {
      color: #484f58;
    }
  }
}

.btn-submit {
  background: #238636;
  border: none;
  border-radius: 6px;
  padding: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #2ea043;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.login-footer {
  margin-top: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;

  a {
    color: #58a6ff;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      text-decoration: underline;
    }
  }

  .back-link {
    color: #8b949e;
  }
}
</style>