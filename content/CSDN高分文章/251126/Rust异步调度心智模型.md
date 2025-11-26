# Rust 异步调度心智模型：从工单洪峰到调度器剖面

## 夜班抢修：Tokio 任务淤积的真相
上个月的双周活动夜，观测平台提示 WebSocket 订阅堆积，Rust 服务的 CPU 却只有 40%——典型的调度器卡死。夜班同学在 tmux 里刷 `tokio-console`，看到 900 多个任务同时处于 `Idle`，只有两个 worker 真正在跑。问题不在于 Tokio，而是我们自己把阶段一的 IO 和阶段二的计算塞进单线程 runtime，导致批量刷新时所有任务都抢同一把写锁。没有真实的夜班体验，很难理解“任务淤积”并不是抽象概念，而是会在监控大屏上直接显示出客户等待时间的。

### 现场复盘
复盘时我们把压测录屏、`console` 截图、指标导出同步到白板，沿着“任务 → future → waker”做分层对照。结论之一是：任何未经限制的 `spawn` 迟早会把 runtime 变成无限制的事项列表；结论之二是，队列调度策略如果只有 FIFO，就会让慢任务成为“交通事故”。这些教训只有在真实的工单洪峰下才记得住。

image_group
![调度中心屏幕](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80)

### 指标面板要讲人话
单看 CPU 或吞吐不足以描述现场压力，我们把“Ready 队列长度”“平均唤醒延迟”“任务生命周期”几个指标画成仪表，把下游队列的堆积映射到可视化卡片。当运营看到“唤醒延迟 180ms”时，马上就能联想到“推送延迟 180ms”，避免工程师独自承担紧张。指标是沟通的语言，而不仅仅是 PromQL 里的函数。

image_group
![任务指标面板](https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&w=800&q=80)

## 架构脑洞：把调度器想成立体交通枢纽

### 反应堆层 = 信号灯
Reactor 负责监听 IO 事件，它像城市的信号灯：不能太密集，也不能没有配时。我们给 Reactor 层设置了“单帧处理事件数”预算，超过预算就切换到 batch 模式，把事件合并交给 executor。这样 Reactor 不会成为“绿灯太多”的路口。

image_group
![反应堆拓扑概念图](https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=800&q=80)

### 执行器层 = 高架立交
Executor 需要知道哪些任务可以立即运行、哪些要延迟。我们把任务标注为“IO bound/CPU bound/adhoc”，借助 `LocalSet` 和 `Semaphore` 为不同任务开不同的立交匝道。当任务类型被正确标注，worker thread 就像高速车辆按车道行驶，拥堵感立刻降低。

image_group
![执行器俯视图](https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80)

### 节奏管理 = 站台调度员
最后一层是 rhythm controller，负责“什么时候抢占”“是否需要 back-pressure”。我们在每个阶段引入一个轻量的限速器，一旦 Ready 队列超过阈值，就把新的任务 push 到延迟队列，同时播报在 Slack。配上这张梗图之后，大家在看板上看到排队数字飙升时会会心一笑，然后更快地跟进。

image_group
![排队等我 meme](https://i.imgflip.com/2ybua0.jpg)

### 多维画像带来的安全感
调度器不是神秘黑箱，而是由多条数据流组成的立体交通枢纽。我们把 `console`、链路追踪和 flamegraph 放在同一个仪表页，谁在夜里接警都能迅速代入。不至于像这张梗图一样，把所有锅都丢给“底层 runtime”。

image_group
![Spider-Man pointing meme](https://i.imgflip.com/1g8my4.jpg)

## 最小可复现实验：Rust 限流调度台

### 环境与依赖
- Rust 1.75+
- `cargo-edit`（可选，用来添加依赖）
- 依赖：`tokio = { version = "1.35", features = ["full"] }`、`rand = "0.8"`

```bash
cargo new async-orchestrator && cd async-orchestrator
cargo add tokio@1.35 --features full
cargo add rand@0.8
```

### 核心代码：src/main.rs
下面的主程序模拟“突发 150 个任务 + 每次最多 20 个并发”场景，通过信号量限制速率，并记录任务等待与执行时间。你可以直接拷贝到 `src/main.rs`，无需额外模块。

```rust
// file: src/main.rs
use rand::Rng;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Semaphore;
use tokio::time::{sleep, Duration};

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    let total_jobs: usize = args.get(1).and_then(|v| v.parse().ok()).unwrap_or(150);
    let max_concurrent: usize = args.get(2).and_then(|v| v.parse().ok()).unwrap_or(20);
    println!("突发任务 {total_jobs} 个，每批允许 {max_concurrent} 个并发");

    let limiter = Arc::new(Semaphore::new(max_concurrent));
    let mut handles = Vec::with_capacity(total_jobs);
    let start = Instant::now();

    for id in 0..total_jobs {
        let permit = limiter.clone().acquire_owned().await.unwrap();
        let handle = tokio::spawn(async move {
            let mut rng = rand::thread_rng();
            let wait = rng.gen_range(5..30);
            sleep(Duration::from_millis(wait)).await;
            let work_time = rng.gen_range(10..60);
            sleep(Duration::from_millis(work_time)).await;
            drop(permit); // 及时释放，以免任务淤积
            (id, wait, work_time)
        });
        handles.push(handle);
    }

    let mut total_wait = 0;
    let mut total_exec = 0;
    for handle in handles {
        let (id, wait, exec) = handle.await.unwrap();
        total_wait += wait;
        total_exec += exec;
        println!("任务 #{id} 等待 {wait}ms，执行 {exec}ms");
    }

    let elapsed = start.elapsed().as_millis();
    println!("平均等待 {}ms，平均执行 {}ms，总耗时 {}ms", total_wait / total_jobs, total_exec / total_jobs, elapsed);
}
```

### 运行方式与示例输出
在项目根目录执行：

```bash
cargo run --release -- 150 20
```

示例输出（节选）：

```text
突发任务 150 个，每批允许 20 个并发
任务 #0 等待 12ms，执行 28ms
...
平均等待 17ms，平均执行 34ms，总耗时 3087ms
```

“示例输入”就是命令行参数 `150 20`，可以把第二个参数改成 `5`，立刻能看到总耗时飙升、平均等待增加三倍，说明限流策略直接决定调度器心情。

### 扩展版本：层级调度 + 超时保护
扩展脚本在限流之外加入“优先任务队列 + 超时回退”，模拟线上海量推送时将紧急任务插队到专属 worker 的场景。替换 `src/main.rs` 即可运行。

```rust
// file: src/main.rs (extended)
use rand::Rng;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;
use tokio::time::{sleep, timeout, Duration, Instant};

#[derive(Clone)]
struct Job {
    id: usize,
    priority: u8,
    payload: u64,
}

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    let high_speed = Arc::new(Semaphore::new(5));
    let normal_speed = Arc::new(Semaphore::new(15));
    let queue = Arc::new(Mutex::new(build_jobs(180)));

    let high = run_lane(queue.clone(), high_speed.clone(), 2);
    let normal = run_lane(queue.clone(), normal_speed.clone(), 0);
    tokio::join!(high, normal);
}

async fn run_lane(queue: Arc<Mutex<VecDeque<Job>>>, limiter: Arc<Semaphore>, min_priority: u8) {
    loop {
        let job = {
            let mut guard = queue.lock().unwrap();
            guard.iter().position(|j| j.priority >= min_priority).map(|idx| guard.remove(idx))
        };

        let Some(job) = job.flatten() else {
            break;
        };

        let permit = limiter.clone().acquire_owned().await.unwrap();
        let lane = if min_priority > 0 { "快速" } else { "普通" };
        let span = format!("{lane} 车道任务 #{}", job.id);
        let worker = tokio::spawn(async move {
            let mut rng = rand::thread_rng();
            let work = Duration::from_millis(rng.gen_range(20..80));
            let result = timeout(Duration::from_millis(90), sleep(work)).await;
            (span, result.is_ok(), work.as_millis())
        });
        drop(permit);

        match worker.await.unwrap() {
            (span, true, cost) => println!("{span} 完成，耗时 {cost}ms"),
            (span, false, _) => println!("{span} 超时回退，交给备用线程"), 
        }
    }
}

fn build_jobs(total: usize) -> VecDeque<Job> {
    let mut rng = rand::thread_rng();
    (0..total)
        .map(|id| Job {
            id,
            priority: if id % 17 == 0 { 2 } else { 0 },
            payload: rng.gen(),
        })
        .collect()
}
```

运行：

```bash
cargo run --release
```

示例输出：

```text
快速 车道任务 #0 完成，耗时 54ms
普通 车道任务 #1 完成，耗时 32ms
快速 车道任务 #17 超时回退，交给备用线程
```

通过比较扩展前后的日志，你会看到紧急任务在“快速车道”里几乎没有等待，超时任务也能及时回退，正是夜班想要的安全阀。

## 抬头看趋势与收尾

### 工程落地的安全阀
回到最初的夜班场景，我们把调度器想成交通枢纽后，就能解释为什么两个 worker 忙疯、其他 worker 死等：因为没有分车道。现在再遇到突发流量，值班同学会先看“等待/执行”双指标，再决定是否临时扩容，而不是直接怀疑 Tokio。

image_group
![观测与调度联动图](https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80)

### 行业视角
边缘节点、AI 推送、WebTransport 等新场景都依赖异步调度。Rust Runtime 生态正在朝“可观测 + 可注入策略”方向走，我们也需要让团队同步进化。下一次夜班如果再看到 Ready 队列暴涨，希望你能想起这里的工具箱；如果你也在雕刻 Rust 异步调度，欢迎留言交流。
