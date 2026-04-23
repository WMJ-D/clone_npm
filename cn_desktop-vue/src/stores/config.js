import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const configList = ref([])
  const CodingEditPath = ref('')
  const CodingEditPathList = ref([])
  const systemTabs = ref([])
  const isLoading = ref(false)
  const activeFilter = ref('all')

  const totalCount = computed(() => configList.value.length)
  const enabledItems = computed(() => configList.value.filter(item => item.enable))
  
  // 返回带序号的列表
  const filteredItems = computed(() => {
    const result = activeFilter.value === 'all' 
      ? configList.value 
      : configList.value.filter(item => item.pName === activeFilter.value)
    
    result.forEach((item, index) => {
      item._index = index + 1
    })
    return result
  })
  
  const groupedByPName = computed(() => {
    const map = new Map()
    configList.value.forEach(item => {
      const key = item.pName || '未命名项目'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return map
  })

  async function loadConfig() {
    isLoading.value = true
    try {
      const data = await window.electronAPI.getConfig()
      configList.value = (data.configList || []).map((item, index) => ({
        ...item,
        id: item.id || `item_${Date.now()}_${index}`
      }))
      CodingEditPath.value = data.CodingEditPath || ''
      CodingEditPathList.value = data.CodingEditPathList || []
      systemTabs.value = data.systemTabs || []
    } catch (e) { console.error('加载配置失败:', e) }
    finally { isLoading.value = false }
  }

  async function saveConfig() {
    try {
      // 使用 toRaw 移除响应式代理，确保可以被 IPC 克隆
      const rawConfigList = toRaw(configList.value).map(item => {
        const raw = toRaw(item)
        // 移除 _index 等内部属性
        const { _index, ...rest } = raw
        return rest
      })
      await window.electronAPI.saveConfig({
        configList: rawConfigList,
        CodingEditPath: toRaw(CodingEditPath.value),
        CodingEditPathList: [...toRaw(CodingEditPathList.value)],
        systemTabs: toRaw(systemTabs.value).map(item => {
                      const raw = toRaw(item)
                      // 移除 _index 等内部属性
                      const { ...rest } = raw
                      return rest
                    })
      })
      return true
    } catch (e) { console.error('保存配置失败:', e); return false }
  }

  function addConfigItem() {
    configList.value.push({
      id: Date.now(), enable: false, pName: '', projectName: '', gitUrl: '',
      branch: 'master', savePath: '', codePath: '', testEnvUrl: '', prodEnvUrl: ''
    })
  }

  function removeConfigItem(index) { configList.value.splice(index, 1) }
  function setFilter(filter) { activeFilter.value = filter }

  return {
    configList, CodingEditPath, CodingEditPathList, systemTabs, isLoading, activeFilter,
    totalCount, enabledItems, filteredItems, groupedByPName,
    loadConfig, saveConfig, addConfigItem, removeConfigItem, setFilter
  }
})
