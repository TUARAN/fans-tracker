# 矩阵号001

一个围绕「技术创作者矩阵运营」打造的内容驾驶舱，集中展示安东尼内容团队在 CSDN、掘金、头条、知乎、InfoQ、公众号、微博、小红书等社区的成长轨迹。这里没有技术搭建教程，只有关于创作、账号矩阵与粉丝增长的故事。

## 平台定位
- **创作中枢**：用数据和策略统一调度「安东尼漫长岁月」「安东尼404」「前端周看」「安东尼与AI」「三十而立方」等矩阵账号。
- **运营仪表盘**：全网粉丝、阅读、收藏、点赞、文章同步刷新，配合动画数字感受增长脉搏。
- **策略白皮书**：每个平台都有专属阶段定位、目标拆解、挑战与机会，形成一份可执行的增长路线。

## 内容体验
- **数据驾驶舱**：
  - 265 名 CSDN 粉丝、72 篇文章、41,583 阅读、35 篇/周输出、18,000 阅读周增等关键指标一目了然。
  - 通过账号卡片快速切换各平台，了解粉丝结构、平台等级、历史涨幅和内容链接。
- **平台成长计划**：
  - 对 CSDN 等站点给出短中长期目标，结合策略、挑战与机会，形成类似 OKR 的运营日志。
  - 按周写下版本化总结，例如 v0.0.2 阶段记录了热点文章策略带来 145 粉丝与 23,583 阅读的跃升。
- **内容创作地图**：
  - 写作计划将面试系列、技术热点、资源集合等主题拆成大纲、发布日期、关键词、投放平台和状态。
  - 文章库保存了热门题材（如「Vue3 面试高频陷阱」「React 面试不背八股」）的阅读、点赞、评论表现，并标记是否由 AI 生成。
- **灵感与节奏**：结合周视图、目标节点与内容标签，帮助团队快速回顾上一阶段的亮点、阻力与下一步任务。

## 适用人群
- 需要管理多平台账号的个人创作者、内容团队或 MCN。
- 希望用可视化方式呈现粉丝与内容积累的运营者。
- 正在打造技术品牌，想要沉淀策略、计划、案例与灵感的创作者。

## 如何阅读这个平台
1. **从仪表盘开始**：观察全局数据、粉丝榜和矩阵账号画像，理解整体势能。
2. **深入平台计划**：选择 CSDN 或其他渠道，查看阶段总结、增长杠杆、内容策略与周度里程碑。
3. **打开文章管理**：在不同分类之间切换，查看每篇内容的表现，并用它们反推选题方向。
4. **结合灵感库行动**：把计划、周总结与文章库串起来，搭建属于你自己的创作节奏。

## 我们正在思考
- 如何在热点与深度之间取得平衡，让高频输出兼顾差异化价值。
- 如何更聪明地调度矩阵账号，让每个平台都承担独特使命。
- 如何借助数据反馈迭代选题，推动粉丝与阅读的可持续增长。

欢迎把它当成一本持续更新的内容运营手册，或直接用于你的创作指挥台。

---

## 当前建设情况（截至 2026-01-08）

这是一个基于 Vue 3 + Vite 的前端内容运营驾驶舱，目前以「前端静态应用 + 本地数据」为主。

已实现能力：

- **数据驾驶舱（首页 `/`）**：矩阵账号排行、全局指标动画、按平台跳转外链等（见 [src/views/DashboardView.vue](src/views/DashboardView.vue)）。
- **平台计划页（`/plan/:platform/:account`）**：阶段总结、目标、策略、挑战、机会、写作计划等（见 [src/views/PlatformPlanView.vue](src/views/PlatformPlanView.vue)）。
- **创作与分发（`/creation`）**：内容规划相关页面入口（见 [src/views/CreationView.vue](src/views/CreationView.vue)）。

数据形态与存储：

- **Pinia Store**：粉丝/平台数据、计划数据、文章库数据（见 [src/stores](src/stores)）。
- **本地持久化**：文章库当前通过 `localStorage` 保存与加载（关键字 `csdn-articles`，见 [src/stores/articles.ts](src/stores/articles.ts)）。
- **内容库（Markdown）**：团队内容沉淀在 `content/` 目录（示例见 [content/CSDN高分文章/260108](content/CSDN高分文章/260108)）。

## 本地开发

环境要求：

- Node.js 18+（推荐 18/20）

启动：

```bash
npm install
npm run dev
```

构建与预览：

```bash
npm run build
npm run preview
```

代码质量：

```bash
npm run type-check
npm run lint
```

## 后续部署方式（规划）

当前项目是典型 Vite SPA，默认产物是静态文件（`dist/`）。因此部署的最佳路径通常是“静态托管优先”，当需要后端采集/定时任务时再引入服务端。

### 方案 A：静态托管（推荐优先）

适用：只做前端展示，本地数据或通过 API 拉取。

- **Vercel / Netlify / Cloudflare Pages**：直接连接仓库，构建命令 `npm run build`，产物目录 `dist`。
- **GitHub Pages**：需要注意 `BASE_URL` 与路由。
  - 当前路由使用 `createWebHistory(import.meta.env.BASE_URL)`（见 [src/router/index.ts](src/router/index.ts)）。
  - 若使用 Pages 这类“无后端重写”的静态环境：要么配置 SPA fallback（所有路径回到 `index.html`），要么考虑切换为 hash 路由（`createWebHashHistory`）。

### 方案 B：Docker + Nginx（适合自有服务器/统一运维）

适用：想在一台服务器上统一跑多个站点，或希望把发布过程容器化。

思路：

1) CI/本地构建出 `dist/`
2) Nginx 容器负责静态托管，并配置 SPA fallback（`try_files $uri /index.html`）

示例 Dockerfile（多阶段构建）：

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### 方案 C：引入后端采集与定时任务（下一阶段）

当需要“自动抓取各平台粉丝/阅读/文章数据”“定时刷新”“多人共享同一套数据”时，建议新增：

- 后端服务（API + 定时任务）
- 数据库（存结构化指标）
- 对象存储或 Git 管理的内容库（Markdown/资产）

届时前端改为从 API 读数据，`localStorage` 仅保留为“草稿/本地缓存”。
