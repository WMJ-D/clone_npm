import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// 默认 API 配置（来自原始项目）
const defaultApiConfigs = [
  { id: 1, name: 'API 1', url: 'http://192.168.82.252:8318/v1', key: 'sk-01-33012860-73a4-465b-be66-73c3b618eca3' },
  { id: 2, name: 'API 2', url: 'http://192.168.82.252:8319/v1', key: 'sk-02-21c522d2-4dce-4af2-aa24-11f79d8c4a2f' },
  { id: 3, name: 'API 3', url: 'http://192.168.82.252:8320/v1', key: 'sk-03-5b4bc65b-69c6-42c6-9395-daf862cf5584' }
]

// 本地存储 key
const STORAGE_KEY = 'ai_api_configs'
const CURRENT_API_KEY = 'ai_current_api_id'

export const useAIStore = defineStore('ai', () => {
  // 从 localStorage 加载或使用默认配置
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.error('加载 AI 配置失败:', e)
    }
    return null
  }

  function loadCurrentApiId() {
    try {
      const saved = localStorage.getItem(CURRENT_API_KEY)
      return saved ? parseInt(saved) : 1
    } catch {
      return 1
    }
  }

  // 初始化
  const savedConfigs = loadFromStorage()
  const apiConfigs = ref(savedConfigs || defaultApiConfigs)
  const currentApiId = ref(loadCurrentApiId())

  // 监听变化自动保存
  watch(apiConfigs, (newConfigs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs))
    } catch (e) {
      console.error('保存 AI 配置失败:', e)
    }
  }, { deep: true })

  watch(currentApiId, (newId) => {
    try {
      localStorage.setItem(CURRENT_API_KEY, String(newId))
    } catch (e) {
      console.error('保存当前 API ID 失败:', e)
    }
  })

  const currentApi = computed(() => apiConfigs.value.find(c => c.id === currentApiId.value) || apiConfigs.value[0])
  
  const models = ref([])
  const modelCategories = ref(['all'])
  const currentCategory = ref('all')
  const isLoadingModels = ref(false)
  
  const messages = ref([])
  const currentModel = ref('')
  const isStreaming = ref(false)

  function setCurrentApi(id) {
    currentApiId.value = id
    currentModel.value = ''
    models.value = []
    modelCategories.value = ['all']
    categoryCounts.value = { 'all': 0 }
    return true
  }

  function addApiConfig() {
    const newId = Math.max(...apiConfigs.value.map(c => c.id), 0) + 1
    apiConfigs.value.push({ id: newId, name: `API ${newId}`, url: '', key: '' })
    return newId
  }

  function updateApiConfig(id, data) {
    const config = apiConfigs.value.find(c => c.id === id)
    if (config) Object.assign(config, data)
  }

  function removeApiConfig(id) {
    if (apiConfigs.value.length <= 1) {
      window.__toast('至少保留一个 API 配置', 'warning')
      return
    }
    const index = apiConfigs.value.findIndex(c => c.id === id)
    if (index > -1) apiConfigs.value.splice(index, 1)
    if (currentApiId.value === id && apiConfigs.value.length > 0) {
      currentApiId.value = apiConfigs.value[0].id
    }
  }

  // 分类及其数量
  const categoryCounts = ref({})

  function setModels(data) {
    models.value = data
    const cats = { 'all': data.length }
    data.forEach(m => {
      if (m.id.includes('gpt')) cats['GPT'] = (cats['GPT'] || 0) + 1
      else if (m.id.includes('claude')) cats['Claude'] = (cats['Claude'] || 0) + 1
      else if (m.id.includes('gemini')) cats['Gemini'] = (cats['Gemini'] || 0) + 1
      else if (m.id.includes('qwen') || m.id.includes('通义')) cats['通义'] = (cats['通义'] || 0) + 1
      else if (m.id.includes('deepseek')) cats['DeepSeek'] = (cats['DeepSeek'] || 0) + 1
      else cats['其他'] = (cats['其他'] || 0) + 1
    })
    modelCategories.value = Object.keys(cats)
    categoryCounts.value = cats
  }

  function setCategory(cat) { currentCategory.value = cat }

  function getFilteredModels() {
    if (currentCategory.value === 'all') return models.value
    const map = {
      'GPT': m => m.id.includes('gpt'), 'Claude': m => m.id.includes('claude'),
      'Gemini': m => m.id.includes('gemini'), '通义': m => m.id.includes('qwen') || m.id.includes('通义'),
      'DeepSeek': m => m.id.includes('deepseek'),
      '其他': m => !['gpt', 'claude', 'gemini', 'qwen', '通义', 'deepseek'].some(k => m.id.includes(k))
    }
    return models.value.filter(map[currentCategory.value] || (() => true))
  }

  function addMessage(role, content) { messages.value.push({ role, content, id: Date.now() }) }
  function updateLastMessage(content) { if (messages.value.length) messages.value[messages.value.length - 1].content = content }
  function clearMessages() { messages.value = [] }

  return {
    apiConfigs, currentApiId, currentApi, models, modelCategories, categoryCounts,
    isLoadingModels, messages, currentModel, isStreaming,
    setCurrentApi, addApiConfig, updateApiConfig, removeApiConfig,
    setModels, setCategory, getFilteredModels, addMessage, updateLastMessage, clearMessages
  }
})
