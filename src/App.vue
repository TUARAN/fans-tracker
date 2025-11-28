<script setup lang="ts">
import { useFansStore } from '@/stores/fans'
import { computed, ref, watch, onMounted } from 'vue'
import { Users, Eye, Sparkles, Zap, FileText, BarChart3, ExternalLink, Edit3, BookOpen } from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import type { CommunityType } from '@/types'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
])

const fansStore = useFansStore()
const router = useRouter()
const route = useRoute()

// 判断是否在首页
const isHomePage = computed(() => route.path === '/' || route.path === '/dashboard')

// 处理创作与分发按钮点击
const handleCreationClick = () => {
  console.log('点击创作与分发按钮，准备跳转到 /creation')
  router.push('/creation').catch(err => {
    console.error('路由跳转失败:', err)
  })
}

// 从store获取数据
const activeAccount = computed(() => fansStore.currentSelectedAccount)
const globalStats = computed(() => fansStore.globalStats)

// 获取各账号统计数据
const anthonyStats = computed(() => fansStore.getAccountStats('anthony'))
const anthony404Stats = computed(() => fansStore.getAccountStats('anthony404'))
const frontendWeeklyStats = computed(() => fansStore.getAccountStats('frontend-weekly'))
const aifsStats = computed(() => fansStore.getAccountStats('code-ai-frosen'))
const thirtyStats = computed(() => fansStore.getAccountStats('thirty-cube'))

// 账号切换方法
const switchAccount = (accountName: string) => {
  fansStore.switchSelectedAccount(accountName)
}

// 格式化数字
const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toLocaleString()
}

// 数字从0到目标值的动画
const animatedFans = ref(0)
const animatedReads = ref(0)
const animatedLikes = ref(0)
const animatedArticles = ref(0)
const animatedFansDisplay = computed(() => formatNumber(animatedFans.value))
const animatedReadsDisplay = computed(() => formatNumber(animatedReads.value))
const animatedLikesDisplay = computed(() => formatNumber(animatedLikes.value))
const animatedArticlesDisplay = computed(() => animatedArticles.value)

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function animateTo(target: number, outRef: { value: number }, duration = 1200) {
  const start = 0
  const startTime = performance.now()
  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    const eased = easeOutCubic(progress)
    outRef.value = Math.round(start + (target - start) * eased)
    if (progress < 1) requestAnimationFrame(tick)
  }
  outRef.value = 0
  requestAnimationFrame(tick)
}

// 省略号动画
const dotsCount = ref(1)
const dotsDirection = ref(1) // 1: 增加, -1: 减少

onMounted(() => {
  animateTo(globalStats.value.totalFans, animatedFans)
  animateTo(globalStats.value.totalReads, animatedReads)
  animateTo(globalStats.value.totalLikes, animatedLikes)
  animateTo(globalStats.value.totalArticles, animatedArticles)
  
  // 省略号动画
  setInterval(() => {
    dotsCount.value += dotsDirection.value
    if (dotsCount.value >= 6) {
      dotsDirection.value = -1
    } else if (dotsCount.value <= 1) {
      dotsDirection.value = 1
    }
  }, 200) // 每200ms更新一次
})

watch(globalStats, (val) => {
  animateTo(val.totalFans, animatedFans)
  animateTo(val.totalReads, animatedReads)
  animateTo(val.totalLikes, animatedLikes)
  animateTo(val.totalArticles, animatedArticles)
})

const dotsDisplay = computed(() => '.'.repeat(dotsCount.value))

// 饼图数据 - 矩阵账号粉丝分布
const pieChartOption = computed(() => {
  const accounts = fansStore.matrixAccounts
  const accountStats = accounts.map(account => ({
    name: account.displayName,
    value: fansStore.getAccountStats(account.id).totalFans,
    color: getAccountColor(account.id)
  })).filter(item => item.value > 0)

  return {
    title: {
      text: '矩阵账号粉丝分布',
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 60,
      itemGap: 12,
      textStyle: {
        fontSize: 12,
        color: '#6b7280'
      },
      formatter: (name: string) => {
        const item = accountStats.find(a => a.name === name)
        return item ? name : ''
      }
    },
    series: [
      {
        name: '粉丝数',
        type: 'pie',
        radius: ['30%', '50%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside', // 标签显示在外部
          formatter: (params: any) => {
            // 确保所有数据都显示标签，包括小数据
            if (params.percent < 1) {
              // 对于小于1%的数据，也显示标签
              return `${params.name}\n${params.percent.toFixed(2)}%`
            }
            return `${params.name}\n${params.percent}%`
          },
          fontSize: 11,
          color: '#374151',
          distanceToLabelLine: 5,
          // 强制显示所有标签，不自动隐藏
          overflow: 'none',
          // 确保小扇区也显示标签
          minShowLabelAngle: 0
        },
        labelLine: {
          show: true,
          showAbove: true, // 标签线显示在扇区上方
          length: 20, // 增加连线长度
          length2: 15,
          smooth: 0.2, // 平滑连线
          lineStyle: {
            color: '#9ca3af',
            width: 1
          }
        },
        minAngle: 0, // 设置最小角度为0，确保小数据也能显示
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: accountStats.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color
          }
        }))
      }
    ]
  }
})

// 获取账号颜色
const getAccountColor = (accountId: string): string => {
  const colorMap: Record<string, string> = {
    'anthony': '#f97316', // orange
    'anthony404': '#ec4899', // pink
    'frontend-weekly': '#10b981', // green
    'code-ai-frosen': '#f59e0b', // amber
    'thirty-cube': '#3b82f6' // blue
  }
  return colorMap[accountId] || '#6b7280'
}

// 平台配置信息
const platformConfigs: Record<CommunityType, { name: string; icon: string; color: string }> = {
  csdn: { name: 'CSDN', icon: '📝', color: 'red' },
  juejin: { name: '掘金', icon: '⛏️', color: 'blue' },
  toutiao: { name: '头条', icon: '📰', color: 'orange' },
  zhihu: { name: '知乎', icon: '🧠', color: 'cyan' },
  _51cto: { name: '51CTO', icon: '💻', color: 'green' },
  wechat: { name: '公众号', icon: '💬', color: 'green' },
  weibo: { name: '微博', icon: '🐦', color: 'red' },
  infoq: { name: 'InfoQ', icon: 'ℹ️', color: 'purple' },
  xiaohongshu: { name: '小红书', icon: '📖', color: 'pink' }
}

// 获取平台URL
const getPlatformUrl = (accountId: string, platform: CommunityType): string | undefined => {
  const accountData = fansStore.matrixAccounts.find(acc => acc.id === accountId)
  if (!accountData) return undefined
  const stats = fansStore.getAccountStats(accountId)
  return stats?.platformStats?.[platform]?.url
}

// 获取平台颜色样式
const getPlatformColors = (platform: CommunityType) => {
  const colorMap: Record<CommunityType, { bg: string; hoverBg: string; border: string; hoverBorder: string; dot: string; icon: string }> = {
    csdn: { bg: 'bg-red-50', hoverBg: 'hover:bg-red-100', border: 'border-red-200', hoverBorder: 'hover:border-red-300', dot: 'bg-red-500', icon: 'text-red-600' },
    juejin: { bg: 'bg-blue-50', hoverBg: 'hover:bg-blue-100', border: 'border-blue-200', hoverBorder: 'hover:border-blue-300', dot: 'bg-blue-500', icon: 'text-blue-600' },
    toutiao: { bg: 'bg-orange-50', hoverBg: 'hover:bg-orange-100', border: 'border-orange-200', hoverBorder: 'hover:border-orange-300', dot: 'bg-orange-500', icon: 'text-orange-600' },
    zhihu: { bg: 'bg-cyan-50', hoverBg: 'hover:bg-cyan-100', border: 'border-cyan-200', hoverBorder: 'hover:border-cyan-300', dot: 'bg-cyan-500', icon: 'text-cyan-600' },
    _51cto: { bg: 'bg-green-50', hoverBg: 'hover:bg-green-100', border: 'border-green-200', hoverBorder: 'hover:border-green-300', dot: 'bg-green-500', icon: 'text-green-600' },
    wechat: { bg: 'bg-emerald-50', hoverBg: 'hover:bg-emerald-100', border: 'border-emerald-200', hoverBorder: 'hover:border-emerald-300', dot: 'bg-emerald-500', icon: 'text-emerald-600' },
    weibo: { bg: 'bg-rose-50', hoverBg: 'hover:bg-rose-100', border: 'border-rose-200', hoverBorder: 'hover:border-rose-300', dot: 'bg-rose-500', icon: 'text-rose-600' },
    infoq: { bg: 'bg-purple-50', hoverBg: 'hover:bg-purple-100', border: 'border-purple-200', hoverBorder: 'hover:border-purple-300', dot: 'bg-purple-500', icon: 'text-purple-600' },
    xiaohongshu: { bg: 'bg-pink-50', hoverBg: 'hover:bg-pink-100', border: 'border-pink-200', hoverBorder: 'hover:border-pink-300', dot: 'bg-pink-500', icon: 'text-pink-600' }
  }
  return colorMap[platform] || colorMap.csdn
}

// 获取所有账号的平台信息（按账号分组，用于在饼图周围显示）
const allPlatformsData = computed(() => {
  const platforms: Array<{ accountId: string; accountName: string; platform: CommunityType; url?: string; accountIndex: number; platformIndex: number }> = []
  
  // 获取账号统计数据，用于计算扇区角度
  const accounts = fansStore.matrixAccounts
  const accountStats = accounts.map(account => ({
    id: account.id,
    name: account.displayName,
    value: fansStore.getAccountStats(account.id).totalFans
  })).filter(item => item.value > 0)
  
  const totalFans = accountStats.reduce((sum, item) => sum + item.value, 0)
  
  // 计算每个账号的起始角度和扇区中心角度
  let currentAngle = -90 // 从顶部开始
  const accountAngles: Record<string, number> = {}
  
  accountStats.forEach((account, index) => {
    const percentage = account.value / totalFans
    const sectorAngle = percentage * 360
    const centerAngle = currentAngle + sectorAngle / 2
    accountAngles[account.id] = centerAngle
    currentAngle += sectorAngle
  })
  
  // 为每个账号的平台分配位置
  accounts.forEach((account, accountIndex) => {
    if (accountStats.find(a => a.id === account.id)) {
      const baseAngle = accountAngles[account.id] || 0
      account.platforms.forEach((platform, platformIndex) => {
        const url = getPlatformUrl(account.id, platform)
        platforms.push({
          accountId: account.id,
          accountName: account.displayName,
          platform,
          url,
          accountIndex,
          platformIndex
        })
      })
    }
  })
  
  return platforms
})

// 饼图容器ref
const chartContainerRef = ref<HTMLElement | null>(null)

// 计算平台按钮位置（围绕饼图圆形分布，确保不超出画布）
const getPlatformButtonPosition = (index: number, total: number) => {
  // 饼图中心在 50% 50% 位置（居中）
  const centerX = 50 // 百分比
  const centerY = 50 // 百分比
  const pieRadius = 25 // 饼图半径百分比（外圈，50%的一半）
  const buttonRadius = 38 // 按钮距离中心的半径，确保不超出画布且不遮挡饼图
  
  // 避开顶部标题区域（-40度到40度），将按钮分布在其他区域
  // 将360度分成total份，但避开顶部区域
  const topExclusionAngle = 80 // 顶部排除角度（-40到40度）
  const availableAngle = 360 - topExclusionAngle // 可用角度
  const angleStep = availableAngle / total // 每个按钮的角度间隔
  
  // 计算角度：从-40度开始，顺时针分布
  const angle = -40 + (index * angleStep) - 90 // -90度调整坐标系
  const radian = (angle * Math.PI) / 180
  
  // 计算按钮位置
  const x = centerX + buttonRadius * Math.cos(radian)
  const y = centerY + buttonRadius * Math.sin(radian)
  
  // 确保不超出边界（留出边距，顶部留更多空间给标题）
  const margin = 5 // 边距百分比
  const topMargin = 12 // 顶部边距，为标题留空间
  const clampedX = Math.max(margin, Math.min(100 - margin, x))
  const clampedY = Math.max(topMargin, Math.min(100 - margin, y))
  
  return {
    left: `${clampedX}%`,
    top: `${clampedY}%`,
    transform: 'translate(-50%, -50%)'
  }
}

</script>

<template>
  <div id="app" class="min-h-screen bg-white">
    <!-- 主内容区域 -->
    <div class="min-h-screen">
        <!-- 极简Banner区域 - 只在首页显示 -->
        <div v-if="isHomePage" class="relative overflow-hidden">
          <div class="relative z-10 max-w-6xl mx-auto px-6 py-8">
            <!-- 导航栏 -->
            <div class="flex justify-end gap-3 mb-6">
              <button
                @click="handleCreationClick"
                class="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors shadow-md hover:shadow-lg cursor-pointer"
              >
                <Edit3 class="w-4 h-4" />
                <span>创作与分发</span>
              </button>
              <a
                href="https://awesome-prompt-seven.vercel.app/tutorials"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-md hover:shadow-lg cursor-pointer"
              >
                <BookOpen class="w-4 h-4" />
                <span>写作上下文</span>
                <ExternalLink class="w-3 h-3" />
              </a>
            </div>
            
            <!-- 标题和介绍 -->
            <div class="text-center mb-8">
              <h1 class="text-4xl font-bold text-gray-800 mb-3">
                矩阵先锋<span class="text-xl font-normal text-amber-600">（个人先行版）</span>
              </h1>
              <p class="text-lg text-gray-600 mb-2">
                多平台内容创作者数据追踪与展示平台，实时监控矩阵账号运营数据
              </p>
              <div class="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span>数据更新时间：2025年11月14日</span>
                <span class="flex items-center space-x-2">
                  <span class="relative flex items-center">
                    <span class="absolute w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                    <span class="relative w-2 h-2 bg-amber-500 rounded-full animate-data-capturing"></span>
                  </span>
                  <span class="animate-text-glow font-medium">
                    <span class="inline-block">数据持续捕获中</span><span class="inline-block w-8 text-left">{{ dotsDisplay }}</span>
                  </span>
                </span>
              </div>
            </div>
            
            <!-- 主要统计卡片 -->
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
              <!-- 矩阵账号 -->
              <div class="bg-white rounded-xl p-6 border border-orange-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <Users class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1">
                    <div class="text-3xl font-bold text-orange-700 mb-1">
                      {{ globalStats.totalAccounts }}
                    </div>
                    <div class="text-gray-600 text-sm font-medium">矩阵账号</div>
                  </div>
                </div>
              </div>

              <!-- 全网粉丝量 -->
              <div class="bg-white rounded-xl p-6 border border-amber-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <Users class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1">
                    <div class="text-3xl font-bold text-amber-600 mb-1">
                        {{ animatedFansDisplay }}
                    </div>
                    <div class="text-gray-600 text-sm font-medium">全网粉丝量</div>
                  </div>
                </div>
              </div>

              <!-- 全网文章数 -->
              <div class="bg-white rounded-xl p-6 border border-emerald-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <FileText class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1">
                    <div class="text-3xl font-bold text-emerald-600 mb-1">
                      {{ animatedArticlesDisplay }}
                    </div>
                    <div class="text-gray-600 text-sm font-medium">全网文章数</div>
                  </div>
                </div>
              </div>

              <!-- 全网阅读量 -->
              <div class="bg-white rounded-xl p-6 border border-orange-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <Eye class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1">
                    <div class="text-3xl font-bold text-orange-600 mb-1">
                        {{ animatedReadsDisplay }}
                      </div>
                    <div class="text-gray-600 text-sm font-medium">全网阅读量</div>
                  </div>
                </div>
              </div>

              <!-- 全网点赞量 -->
              <div class="bg-white rounded-xl p-6 border border-yellow-200 shadow-md hover:shadow-lg transition-all duration-300">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                    <Sparkles class="w-6 h-6 text-white" />
                  </div>
                  <div class="flex-1">
                    <div class="text-3xl font-bold text-yellow-600 mb-1">
                      {{ animatedLikesDisplay }}
                    </div>
                    <div class="text-gray-600 text-sm font-medium">全网点赞量</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 矩阵账号粉丝分布饼图 -->
            <div class="mt-8 bg-white rounded-xl p-6 border border-gray-200 shadow-md">
              <div ref="chartContainerRef" class="relative" style="height: 500px;">
                <!-- 饼图 -->
                <v-chart
                  :option="pieChartOption"
                  class="w-full h-full"
                  autoresize
                />
                
                <!-- 平台按钮容器 -->
                <div class="absolute inset-0 pointer-events-none" style="z-index: 20;">
                  <div 
                    v-for="(platformData, index) in allPlatformsData" 
                    :key="`${platformData.accountId}-${platformData.platform}`"
                    class="absolute pointer-events-auto"
                    :style="getPlatformButtonPosition(index, allPlatformsData.length)"
                  >
                    <a
                      v-if="platformData.url"
                      :href="platformData.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      :class="[
                        'flex items-center space-x-2 px-3 py-2 border rounded-lg text-xs font-medium transition-all cursor-pointer hover:shadow-md whitespace-nowrap',
                        getPlatformColors(platformData.platform).bg,
                        getPlatformColors(platformData.platform).hoverBg,
                        getPlatformColors(platformData.platform).border,
                        getPlatformColors(platformData.platform).hoverBorder
                      ]"
                    >
                      <div :class="['w-2 h-2 rounded-full', getPlatformColors(platformData.platform).dot]"></div>
                      <span class="text-gray-700">{{ platformConfigs[platformData.platform]?.name || platformData.platform }}</span>
                      <ExternalLink :class="['w-3 h-3', getPlatformColors(platformData.platform).icon]" />
                    </a>
                    <div
                      v-else
                      :class="[
                        'flex items-center space-x-2 px-3 py-2 border rounded-lg text-xs font-medium cursor-default whitespace-nowrap bg-gray-50 border-gray-200'
                      ]"
                    >
                      <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span class="text-gray-600">{{ platformConfigs[platformData.platform]?.name || platformData.platform }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 路由视图 -->
        <router-view />
    </div>
  </div>
</template>

<style scoped>
/* 极简滚动条 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb {
  background: #f59e0b;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #d97706;
}

/* 数据捕获中动画 */
@keyframes dataCapturing {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.6;
    transform: scale(1.1);
  }
}

@keyframes textGlow {
  0%, 100% { 
    color: #6b7280;
  }
  50% { 
    color: #f59e0b;
  }
}

.animate-data-capturing {
  animation: dataCapturing 2s ease-in-out infinite;
}

.animate-text-glow {
  animation: textGlow 2s ease-in-out infinite;
}
</style>