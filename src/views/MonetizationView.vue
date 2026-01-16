<script setup lang="ts">
import { useRouter } from 'vue-router'
import { DollarSign, ExternalLink } from 'lucide-vue-next'

const router = useRouter()

// "写即有钱"平台数据
const monetizationPlatforms = [
  {
    category: '国内内容平台',
    description: '流量大、起量快，适合技术与AI内容',
    platforms: [
      { name: '知乎', icon: '🧠', url: 'https://www.zhihu.com', description: '长文与专栏变现，适合深度技术内容', color: 'bg-blue-50 border-blue-200' },
      { name: '小红书', icon: '📖', url: 'https://www.xiaohongshu.com', description: '笔记种草与知识内容，适合工具/教程/总结', color: 'bg-pink-50 border-pink-200' },
      { name: '头条号', icon: '📰', url: 'https://www.toutiao.com', description: '内容分发与流量补贴，适合技术科普', color: 'bg-orange-50 border-orange-200' },
      { name: '百家号', icon: '🐻', url: 'https://baijiahao.baidu.com', description: '百度系流量，适合教程与经验分享', color: 'bg-yellow-50 border-yellow-200' },
      { name: 'B站', icon: '📺', url: 'https://www.bilibili.com', description: '视频变现，适合做系列课与实战录屏', color: 'bg-cyan-50 border-cyan-200' },
      { name: '抖音', icon: '🎵', url: 'https://www.douyin.com', description: '短视频流量，适合做“3分钟讲清楚”系列', color: 'bg-gradient-to-r from-gray-900 to-gray-700' }
    ]
  },
  {
    category: '技术社区与开发者平台',
    description: '垂直人群集中，适合沉淀影响力与引流',
    platforms: [
      { name: '掘金', icon: '⛏️', url: 'https://juejin.cn', description: '技术文章与专栏，适合工程实践', color: 'bg-blue-50 border-blue-200' },
      { name: 'CSDN', icon: '📝', url: 'https://www.csdn.net', description: '技术流量大，适合体系化教程', color: 'bg-red-50 border-red-200' },
      { name: 'InfoQ', icon: 'ℹ️', url: 'https://www.infoq.cn', description: '高质量技术社区，适合深度文章', color: 'bg-purple-50 border-purple-200' },
      { name: '51CTO', icon: '💻', url: 'https://www.51cto.com', description: '企业级技术内容，适合运维/架构', color: 'bg-green-50 border-green-200' }
    ]
  },
  {
    category: '付费订阅与知识产品',
    description: '适合做长期订阅、课程与咨询',
    platforms: [
      { name: '知识星球', icon: '⭐', url: 'https://wx.zsxq.com', description: '技术内容付费订阅，AI工程化内容适合', color: 'bg-yellow-50 border-yellow-200' },
      { name: '小鹅通', icon: '🦢', url: 'https://www.xiaoe-tech.com', description: '技术文章沉淀为课程或手册', color: 'bg-indigo-50 border-indigo-200' }
    ]
  },
  {
    category: '海外技术平台',
    description: '可同步发布，收益不错',
    platforms: [
      { name: 'Medium', icon: '📰', url: 'https://medium.com', description: 'AI/软件工程收益不错，阅读按分钟计费', color: 'bg-gray-50 border-gray-200' },
      { name: 'Substack', icon: '📧', url: 'https://substack.com', description: '订阅制科技newsletter，技术洞察适合', color: 'bg-orange-50 border-orange-200' }
    ]
  }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- 页面标题 -->
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-3">
            <DollarSign class="w-8 h-8 text-amber-600" />
            <span>写即有钱</span>
          </h1>
          <p class="text-gray-600">变现平台清单与推荐优先级</p>
        </div>
        <button
          @click="router.push('/')"
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          返回首页
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <DollarSign class="w-6 h-6 text-amber-600" />
            <h2 class="text-2xl font-bold text-gray-800">写即有钱 - 变现平台清单</h2>
          </div>
        </div>

        <div class="p-6">
          <div class="space-y-8">
            <div
              v-for="category in monetizationPlatforms"
              :key="category.category"
              class="space-y-4"
            >
              <div class="border-l-4 border-amber-500 pl-4">
                <h3 class="text-xl font-bold text-gray-800 mb-1">{{ category.category }}</h3>
                <p class="text-sm text-gray-600">{{ category.description }}</p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <a
                  v-for="platform in category.platforms"
                  :key="platform.name"
                  :href="platform.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  :class="[
                    'p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer',
                    platform.color,
                    platform.name === '抖音' ? 'text-white' : ''
                  ]"
                >
                  <div class="flex items-center space-x-3 mb-2">
                    <span class="text-2xl">{{ platform.icon }}</span>
                    <h4 :class="['font-bold', platform.name === '抖音' ? 'text-white' : 'text-gray-800']">{{ platform.name }}</h4>
                  </div>
                  <p :class="['text-xs leading-relaxed', platform.name === '抖音' ? 'text-gray-200' : 'text-gray-600']">{{ platform.description }}</p>
                  <div :class="['mt-3 flex items-center text-xs font-medium', platform.name === '抖音' ? 'text-amber-300' : 'text-amber-600']">
                    <ExternalLink class="w-3 h-3 mr-1" />
                    <span>访问平台</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200 bg-gray-50">
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p class="text-sm text-amber-800">
              <span class="font-semibold">💡 推荐优先开通：</span>
              知乎、小红书、头条号、百家号、B站、抖音、掘金、CSDN、InfoQ
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
