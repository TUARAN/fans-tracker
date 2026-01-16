<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type ReadmeDoc = {
  id: string
  title: string
  path: string
  raw: string
}

// 读取 content 目录下每个分类 README 的“写作指令/规则”内容
// 使用 Vite 的 import.meta.glob 在构建期把 README 作为 raw string 打包进来
const readmeRawMap = import.meta.glob('/content/**/README.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const readmeDocs: ReadmeDoc[] = Object.entries(readmeRawMap)
  .map(([path, raw]) => {
    const parts = path.split('/').filter(Boolean)
    const contentIndex = parts.lastIndexOf('content')
    const categoryName = contentIndex >= 0 ? parts[contentIndex + 1] : parts[parts.length - 2]
    return {
      id: path,
      title: categoryName || path,
      path,
      raw
    }
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))

const selectedReadmeId = ref<string>(readmeDocs[0]?.id ?? '')
const selectedReadme = computed(() => readmeDocs.find(d => d.id === selectedReadmeId.value))

const viewMode = ref<'preview' | 'raw'>('preview')
const copied = ref(false)

const renderedHtml = computed(() => {
  const raw = selectedReadme.value?.raw ?? ''
  const html = marked.parse(raw) as string
  return DOMPurify.sanitize(html)
})

async function copyCommand() {
  const text = selectedReadme.value?.raw ?? ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1200)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-3">
          <BookOpen class="w-8 h-8 text-blue-600" />
          <span>写作上下文</span>
        </h1>
        <p class="text-gray-600">从 content/**/README.md 汇总展示写作指令与规则</p>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          <div class="flex items-center space-x-2 min-w-0">
            <BookOpen class="w-5 h-5 text-gray-600" />
            <h2 class="text-lg font-semibold text-gray-700">写作指令</h2>
            <span class="text-xs text-gray-500 hidden sm:inline">来自 content/**/README.md</span>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
                @click="viewMode = 'preview'"
              >
                Markdown 预览
              </button>
              <button
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="viewMode === 'raw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
                @click="viewMode = 'raw'"
              >
                纯文本
              </button>
            </div>

            <button
              class="px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              @click="copyCommand"
            >
              {{ copied ? '已复制' : '复制命令' }}
            </button>
          </div>
        </div>

        <div v-if="readmeDocs.length === 0" class="p-6 text-sm text-gray-500">
          未找到任何 README 指令文档（content/**/README.md）
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-4">
          <div class="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
            <div class="p-2">
              <button
                v-for="doc in readmeDocs"
                :key="doc.id"
                @click="selectedReadmeId = doc.id"
                class="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="selectedReadmeId === doc.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-700 hover:bg-white/60'"
              >
                {{ doc.title }}
              </button>
            </div>
          </div>

          <div class="lg:col-span-3 p-4">
            <div v-if="!selectedReadme" class="text-sm text-gray-500">
              请选择左侧分类查看指令
            </div>
            <div v-else class="max-h-[70vh] overflow-auto">
              <div
                v-if="viewMode === 'preview'"
                class="markdown-body text-sm leading-7 text-gray-700"
                v-html="renderedHtml"
              />
              <pre
                v-else
                class="whitespace-pre-wrap text-sm leading-6 text-gray-700"
              >{{ selectedReadme.raw }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-body :deep(h1) {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
}
.markdown-body :deep(h2) {
  font-size: 1.125rem;
  line-height: 1.75rem;
  font-weight: 700;
  margin: 1rem 0 0.5rem 0;
}
.markdown-body :deep(h3) {
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 700;
  margin: 0.75rem 0 0.25rem 0;
}
.markdown-body :deep(p) {
  margin: 0.5rem 0;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.25rem;
}
.markdown-body :deep(li) {
  margin: 0.25rem 0;
}
.markdown-body :deep(code) {
  background: rgb(243 244 246);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.875em;
}
.markdown-body :deep(pre) {
  background: rgb(17 24 39);
  color: rgb(243 244 246);
  padding: 0.75rem;
  border-radius: 0.75rem;
  overflow: auto;
  margin: 0.75rem 0;
}
.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid rgb(209 213 219);
  padding-left: 0.75rem;
  color: rgb(75 85 99);
  margin: 0.75rem 0;
}
.markdown-body :deep(a) {
  color: rgb(37 99 235);
  text-decoration: underline;
}
</style>
