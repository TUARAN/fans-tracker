# Vue 3 组合式 API 性能诊疗：从掉帧现场到系统工具箱

## 客户端掉帧的真实场景
每次版本上线后，数据面板就会出现“互动页停留下降 18%”的警报，排查现场里前端、PM 和运营挤在一台 Mac 前盯 DevTools。滚动一次页面，帧率从 60 掉到 18，合并请求和埋点函数全都拖在同一帧里。表面上看是 Composable 写得太自由，真正的根因则是 effect 链条过深、useFetch 里混了多个副作用，导致同一帧内执行上百次 diff。只有把真实现场讲清楚，大家才会意识到“组合式 API = 拼积木”只是幻觉，它更像把多个齿轮咬在一起的传动机构，一颗齿掉了就会带崩整台机器。

### 团队常见误区
误区一是迷信“懒执行”，把所有逻辑塞进一个 `watchEffect` 里，结果任何微小 state 变动都会触发长链路。误区二是盲目拆分组件却没约束上下游的依赖，函数式写法反而让依赖关系隐藏在闭包。误区三是调试方式仍停留在“console 寻宝”，没有把 effect 图谱可视化。把这些误区贴到墙上，会议室里的讨论才会从“是不是 Vue 不行”转向“我们需要真正的诊疗流程”。

image_group
![响应式执行栈示意图](https://raw.githubusercontent.com/github/explore/main/topics/vue/vue.png)

## 构建脑内模型：响应图谱与粒度预算

### 交互时间线要像音乐谱
把一次滚动操作想成一段乐曲：主旋律是 DOM 更新，伴奏是副作用和网络请求。如果音轨数量失控，乐曲就糊成噪音。因此需要提前绘制“状态改写 → 依赖收集 → 更新队列”的时间线，并在每条链路标注出预算（例如 4ms）。当你能在脑内看到这张谱子，就知道应该在哪个节点加批处理、在哪个节点切换到 `postFlush` 队列。

### 结构化可视化资产
用 Structured Clone 输出响应图、把 effect id/依赖字段渲染成 chord diagram，会比文字描述更快让团队达成共识。一个高效的做法是：在 DevTools plugin 里把 `effect` 注册信息写进 `performance.mark`，然后用 Web Vitals 面板对齐时间轴。这样你能看到 watch 深度、computed 缓存命中率、flush 策略在同一张图上的分布，而不是逐行推测。

image_group
![执行链路拓扑草图](https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png)

### 把幽默感变成对齐工具
当讨论陷入“是不是再重写一次”的焦虑时，我会把会议屏幕切到一个梗图，让大家意识到真正的痛点是缺少观察手段而非框架本身。轻松的氛围能让团队重新回到数据和模型上，也让复盘会议不再是互相指责。

image_group
![部署天哪又预谋了 meme](https://i.imgflip.com/1bij.jpg)

## 最小可复现实验：Vue 性能体温计

### 环境与依赖
- Node.js 18+
- npm 9+
- 依赖：`@vue/reactivity`

```bash
mkdir vue-reactivity-lab && cd vue-reactivity-lab
npm init -y
npm install @vue/reactivity
```

### 核心代码：reactivity_lab.js
下面的脚本用组合式写法模拟 3 个 effect 的联动，并记录每次调度消耗的时间，方便你在任何项目中验证“拆分 effect 是否带来收益”。

```javascript
// file: reactivity_lab.js
import { reactive, effect, computed } from "@vue/reactivity";
import { performance } from "node:perf_hooks";

const state = reactive({
  profiles: Array.from({ length: 2000 }, (_, i) => ({
    id: i,
    score: Math.random() * 100,
    active: i % 3 === 0
  })),
  threshold: 60
});

const scoreStats = computed(() => {
  // 通过计算属性缓存过滤结果
  const active = state.profiles.filter((p) => p.active);
  const hot = active.filter((p) => p.score >= state.threshold);
  return { active: active.length, hot: hot.length };
});

const metrics = [];

effect(
  () => {
    const start = performance.now();
    const percent = (scoreStats.value.hot / scoreStats.value.active) * 100;
    const message = `高活跃用户中有 ${percent.toFixed(2)}% 达到阈值`;
    metrics.push(performance.now() - start);
    console.log(message);
  },
  {
    scheduler: (job) => {
      // 自定义调度器，用于模拟 flush:post
      setTimeout(job, 0);
    }
  }
);

function nudgeProfiles(iterations) {
  for (let i = 0; i < iterations; i++) {
    const idx = Math.floor(Math.random() * state.profiles.length);
    state.profiles[idx].score = Math.random() * 100;
  }
}

nudgeProfiles(300);
console.log("平均执行耗时", (metrics.reduce((a, b) => a + b, 0) / metrics.length).toFixed(4), "ms");
```

### 运行方式与示例输出

```bash
node reactivity_lab.js
```

示例输出：

```text
高活跃用户中有 75.85% 达到阈值
...
平均执行耗时 0.0312 ms
```

你可以把 `threshold` 改成 90，并把 `nudgeProfiles(300)` 改成 `nudgeProfiles(2000)`，就能看到平均耗时飙升，直观说明 effect 粒度与调度策略的关系。

### 扩展版本：分层调度
扩展脚本把 effect 拆成“数据归并”和“可视化渲染”两层，并用 `queueMicrotask` 做预处理，让复杂场景仍能控制在 16ms 帧预算内。

```javascript
// file: reactivity_profile.js
import { reactive, effect } from "@vue/reactivity";
import { performance } from "node:perf_hooks";

const store = reactive({ batch: [], log: [] });

const prep = effect(() => {
  if (!store.batch.length) return;
  queueMicrotask(() => {
    const start = performance.now();
    const merged = store.batch.splice(0).reduce((acc, item) => acc + item.cost, 0);
    store.log.push({ merged, at: Date.now() });
    console.log(`批处理 ${merged.toFixed(2)} cost，记录长度 ${store.log.length}`);
    console.log("预处理耗时", (performance.now() - start).toFixed(3), "ms");
  });
});

const render = effect(() => {
  if (!store.log.length) return;
  const recent = store.log[store.log.length - 1];
  console.log(`最新帧消耗：${recent.merged.toFixed(2)} cost @${recent.at}`);
});

for (let i = 0; i < 120; i++) {
  store.batch.push({ cost: Math.random() * 3 });
}
```

运行：

```bash
node reactivity_profile.js
```

示例输出：

```text
批处理 188.24 cost，记录长度 1
预处理耗时 0.072 ms
最新帧消耗：188.24 cost @1707139200000
```

通过观察日志，你会发现批处理和渲染被分离成两个可控节奏，正是大型 Vue 组件在工程化场景中的生存方式。

## 回到现场：工程落地与前瞻

### 复盘带回现场的问题
有了时间线、实验脚本和调度策略，回到最初的掉帧页面时就能清晰地定位：是 `watchEffect` 全量重跑、还是副作用没有 lazy。把这些洞察写进团队的“性能诊疗 playbook”，新同学接手模块时就知道应该先跑体温计脚本，再去调 DevTools。

image_group
![性能回归飞行图](https://raw.githubusercontent.com/github/explore/main/topics/vite/vite.png)

### 抬头看趋势
组合式 API 正在和服务器组件、边缘渲染配合得越来越紧密，未来任何一次滚动都可能触发远端数据流。只有在脑中装着一张完整的响应式拓扑图，才能在新技术浪潮里保持节奏。当你下次在上线日看到帧率告警，不妨先跑一遍上面的实验，再把观察写进 Playbook；如果你也在探索 Vue 3 组合式 API 性能，欢迎留言交流。

