<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  FileText, 
  FolderOpen, 
  Plus, 
  Search,
  BookOpen,
  Sparkles,
  Edit3,
  ExternalLink,
  Calendar,
  Tag
} from 'lucide-vue-next'

const router = useRouter()

// 内容分类配置
const categories = [
  {
    id: 'csdn-high-score',
    name: 'CSDN高分文章',
    icon: '📝',
    color: 'bg-red-50 border-red-200 text-red-700',
    hoverColor: 'hover:bg-red-100 hover:border-red-300',
    dotColor: 'bg-red-500',
    description: '在CSDN平台发布的高分文章'
  },
  {
    id: 'zhihu-encrypted',
    name: '知乎加密专栏',
    icon: '🔒',
    color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    hoverColor: 'hover:bg-cyan-100 hover:border-cyan-300',
    dotColor: 'bg-cyan-500',
    description: '知乎平台的加密专栏内容'
  },
  {
    id: 'xiaohongshu-article',
    name: '小红书长文',
    icon: '📖',
    color: 'bg-pink-50 border-pink-200 text-pink-700',
    hoverColor: 'hover:bg-pink-100 hover:border-pink-300',
    dotColor: 'bg-pink-500',
    description: '小红书平台的长文内容'
  },
  {
    id: 'repost-remix',
    name: '转载二创',
    icon: '♻️',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    hoverColor: 'hover:bg-purple-100 hover:border-purple-300',
    dotColor: 'bg-purple-500',
    description: '转载并二次创作的内容'
  },
  {
    id: 'deep-thinking',
    name: '深度思考',
    icon: '💭',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    hoverColor: 'hover:bg-blue-100 hover:border-blue-300',
    dotColor: 'bg-blue-500',
    description: '深度思考类原创内容'
  },
  {
    id: 'inbox',
    name: 'INBOX-待归类',
    icon: '📥',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    hoverColor: 'hover:bg-gray-100 hover:border-gray-300',
    dotColor: 'bg-gray-500',
    description: '待分类和整理的内容'
  }
]

// 当前选中的分类
const selectedCategory = ref<string | null>(null)

// 搜索关键词
const searchKeyword = ref('')

// 文章列表（模拟数据，后续可以从文件系统读取）
const articles = ref<Array<{
  id: string
  title: string
  category: string
  createTime: string
  updateTime: string
  fileName: string
  status: 'draft' | 'published' | 'archived'
  tags: string[]
}>>([])

// 根据分类筛选文章
const filteredArticles = computed(() => {
  let result = articles.value

  // 按分类筛选
  if (selectedCategory.value) {
    result = result.filter(article => article.category === selectedCategory.value)
  }

  // 按关键词搜索
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(article => 
      article.title.toLowerCase().includes(keyword) ||
      article.tags.some(tag => tag.toLowerCase().includes(keyword))
    )
  }

  // 按更新时间倒序排列
  return result.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime())
})

// 获取分类信息
const getCategoryInfo = (categoryId: string) => {
  return categories.find(cat => cat.id === categoryId) || categories[0]
}

// 选中分类
const selectCategory = (categoryId: string | null) => {
  selectedCategory.value = selectedCategory.value === categoryId ? null : categoryId
}

// 获取分类下的文章数量
const getCategoryArticleCount = (categoryId: string) => {
  return articles.value.filter(article => article.category === categoryId).length
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 在IDE中打开文件
const openInIDE = (fileName: string, categoryId: string) => {
  // 这里可以触发VS Code的打开文件命令
  // 实际实现可能需要与IDE API集成
  const categoryName = getCategoryInfo(categoryId).name
  const filePath = `content/${categoryName}/${fileName}`
  console.log('打开文件:', filePath)
  // 可以通过vscode API或者其他方式打开文件
}

onMounted(() => {
  // 这里可以读取文件系统中的MD文件列表
  // 暂时使用空列表，后续可以根据实际文件系统读取
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- 页面标题 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-3">
          <Edit3 class="w-8 h-8 text-amber-600" />
          <span>创作与分发</span>
        </h1>
        <p class="text-gray-600">
          在IDE中编辑Markdown文档，然后发布到各个矩阵号平台
        </p>
      </div>

      <!-- 搜索栏 -->
      <div class="mb-6">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索文章标题或标签..."
            class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      <!-- 分类导航 -->
      <div class="mb-8">
        <div class="flex items-center space-x-3 mb-4">
          <Tag class="w-5 h-5 text-gray-600" />
          <h2 class="text-lg font-semibold text-gray-700">内容分类</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="category in categories"
            :key="category.id"
            @click="selectCategory(category.id)"
            :class="[
              'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
              category.color,
              category.hoverColor,
              selectedCategory === category.id ? 'ring-2 ring-offset-2 ring-amber-500' : ''
            ]"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center space-x-3">
                <div :class="['w-3 h-3 rounded-full', category.dotColor]"></div>
                <span class="text-2xl">{{ category.icon }}</span>
                <div>
                  <h3 class="font-semibold text-sm">{{ category.name }}</h3>
                  <p class="text-xs opacity-75 mt-1">{{ category.description }}</p>
                </div>
              </div>
              <span class="text-xs font-medium bg-white px-2 py-1 rounded-full">
                {{ getCategoryArticleCount(category.id) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 文章列表 -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-700 flex items-center space-x-2">
              <FileText class="w-5 h-5" />
              <span>
                {{ selectedCategory ? getCategoryInfo(selectedCategory).name : '全部文章' }}
                ({{ filteredArticles.length }})
              </span>
            </h2>
            <button
              @click="router.push('/')"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>

        <div v-if="filteredArticles.length === 0" class="p-12 text-center">
          <FolderOpen class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500 mb-2">
            {{ selectedCategory ? '该分类下暂无文章' : '暂无文章' }}
          </p>
          <p class="text-sm text-gray-400">
            在IDE中创建Markdown文件后，它们将自动显示在这里
          </p>
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div
            v-for="article in filteredArticles"
            :key="article.id"
            class="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
            @click="openInIDE(article.fileName, article.category)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-3 mb-2">
                  <h3 class="text-lg font-semibold text-gray-800 truncate">
                    {{ article.title }}
                  </h3>
                  <span
                    :class="[
                      'px-2 py-1 text-xs font-medium rounded-full',
                      article.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : article.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    ]"
                  >
                    {{ article.status === 'published' ? '已发布' : article.status === 'draft' ? '草稿' : '已归档' }}
                  </span>
                </div>
                
                <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span class="flex items-center space-x-1">
                    <Calendar class="w-4 h-4" />
                    <span>创建: {{ formatDate(article.createTime) }}</span>
                  </span>
                  <span class="flex items-center space-x-1">
                    <Edit3 class="w-4 h-4" />
                    <span>更新: {{ formatDate(article.updateTime) }}</span>
                  </span>
                  <span class="flex items-center space-x-1">
                    <FileText class="w-4 h-4" />
                    <span>{{ article.fileName }}</span>
                  </span>
                </div>

                <div v-if="article.tags.length > 0" class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in article.tags"
                    :key="tag"
                    class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div class="flex items-center space-x-2 ml-4">
                <button
                  @click.stop="openInIDE(article.fileName, article.category)"
                  class="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="在IDE中打开"
                >
                  <ExternalLink class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div class="flex items-start space-x-3">
          <BookOpen class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="font-semibold text-amber-800 mb-2">使用说明</h3>
            <ul class="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>在IDE中编辑Markdown文档，文件保存在 <code class="bg-amber-100 px-1 rounded">content/</code> 目录下对应的分类文件夹中</li>
              <li>文件创建或更新后会自动显示在对应的分类下</li>
              <li>点击文章可以在IDE中打开对应的文件进行编辑</li>
              <li>编辑完成后，可以通过发布功能将内容分发到各个矩阵号平台</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
code {
  font-family: 'Courier New', monospace;
}
</style>

