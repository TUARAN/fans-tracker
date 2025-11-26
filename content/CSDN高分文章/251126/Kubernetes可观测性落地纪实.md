# Kubernetes 可观测性落地纪实：从脏指标到自愈路径

## 警报调度的日常冲突
几个星期前，夜值页面突然冒出“订单 API 错误率 > 10%”的红牌，SRE 打开 Prometheus 看到 P99 飙升，应用团队却在日志里找不到异常。半小时后发现是节点上的 CNI 插件重启、Pod 重调度，旧的 scrape target 没有及时更新，导致告警指向了早已消失的 Pod。这个场景听起来平常，却是很多团队每天都在经历的：指标说宕机，日志说正常，真实用户体验早已下降。

### 误报与漏报的根因
我们把那晚的所有证据贴到 Miro 白板，把“事件发生 → 指标采集 → 告警模板 → 值班动作”画成一条路。结果发现：指标延迟 90 秒、事件表没有下钻链接、日志查询脚本还在查旧命名空间。可观测性并不是“接入几个 exporter”这么简单，而是要让指标、事件、日志讲同一个故事。

image_group
![Kubernetes 控制面示意](https://raw.githubusercontent.com/github/explore/main/topics/kubernetes/kubernetes.png)

## 心智模型：事件、指标、日志的叙事结构

### 多线程叙事
把集群想成一部多线程小说：事件是情节转折，指标是情绪曲线，日志是对话。任何一个线程断裂，读者就会迷路。所以我们给每个重要事件加了“上下文贴纸”：Namespace、Pod、节点、Git 提交、灰度批次，让人即使只看事件流也能猜到故事的发展。

### 可视化是协作语言
我们把 Grafana 仪表改成“事件条 + 指标折线 + 日志切片”联动视图，值班同学点一下事件条，就能在同一屏里看到当时的 CPU、延迟和关键日志。当界面里出现下面这张梗图时，大家会心一笑——提醒自己不要再把所有锅甩给网络同学。

image_group
![meme: blame kubernetes](https://i.imgflip.com/26am.jpg)

image_group
![观测面板设计手稿](https://raw.githubusercontent.com/github/explore/main/topics/grafana/grafana.png)

## 最小可复现实验：K8s 事件回放仪表

### 环境与依赖
- Python 3.10+
- macOS/Linux/WSL 均可
- 依赖：`pyyaml`、`rich`

```bash
python3 -m venv k8s-observe && cd k8s-observe
source bin/activate
pip install pyyaml rich
```

### 核心代码：events_lab.py
该脚本模拟 `kubectl get events -o yaml` 的解析过程，并按 Namespace + 原因聚合，同时给你一个“最可能要检查的指标列表”，方便值班同学秒级定位。

```python
# file: events_lab.py
import json
from pathlib import Path
from typing import Dict, List

import yaml
from rich.console import Console
from rich.table import Table

console = Console()


def load_events(path: Path) -> List[Dict]:
  with path.open("r", encoding="utf-8") as fh:
    data = yaml.safe_load(fh)
  return data.get("items", [])


def group(events: List[Dict]) -> Dict[str, List[Dict]]:
  buckets: Dict[str, List[Dict]] = {}
  for evt in events:
    ns = evt.get("metadata", {}).get("namespace", "default")
    reason = evt.get("reason", "Unknown")
    key = f"{ns}:{reason}"
    buckets.setdefault(key, []).append(evt)
  return buckets


def suggest_checks(reason: str) -> List[str]:
  mapping = {
    "FailedScheduling": ["查看 scheduler 日志", "检查节点 allocatable", "确认 Pod 拓扑约束"],
    "Unhealthy": ["查看 readiness 探针", "查看最近发布记录", "检查 service mesh"],
    "BackOff": ["确认镜像拉取", "查看 init 容器日志"],
  }
  return mapping.get(reason, ["查看节点事件", "kubectl logs -n <ns> <pod>"])


def render_table(buckets: Dict[str, List[Dict]]) -> None:
  table = Table(title="事件聚合仪表")
  table.add_column("命名空间:原因")
  table.add_column("最近 5 分钟次数")
  table.add_column("建议动作")
  for key, items in buckets.items():
    ns, reason = key.split(":")
    actions = "; ".join(suggest_checks(reason))
    table.add_row(key, str(len(items)), actions)
  console.print(table)

  timeline = [
    {
      "ns": item.get("metadata", {}).get("namespace"),
      "reason": item.get("reason"),
      "pod": item.get("involvedObject", {}).get("name"),
      "time": item.get("lastTimestamp"),
    }
    for item in sum(buckets.values(), [])
  ]
  console.print("事件时间线：")
  console.print(json.dumps(timeline, indent=2, ensure_ascii=False))


if __name__ == "__main__":
  events = load_events(Path("events.sample.yaml"))
  buckets = group(events)
  render_table(buckets)
```

### 示例输入
把下面的内容保存为 `events.sample.yaml`，即可模拟一次 Deployment 滚动时的事件序列。

```yaml
apiVersion: v1
items:
  - metadata:
      namespace: checkout
    reason: FailedScheduling
    lastTimestamp: "2024-05-12T14:21:03Z"
    involvedObject:
      kind: Pod
      name: checkout-6d7bf4d7d8-2kgxk
  - metadata:
      namespace: checkout
    reason: FailedScheduling
    lastTimestamp: "2024-05-12T14:21:05Z"
    involvedObject:
      kind: Pod
      name: checkout-6d7bf4d7d8-5nb2p
  - metadata:
      namespace: checkout
    reason: BackOff
    lastTimestamp: "2024-05-12T14:21:40Z"
    involvedObject:
      kind: Pod
      name: checkout-6d7bf4d7d8-2kgxk
  - metadata:
      namespace: notification
    reason: Unhealthy
    lastTimestamp: "2024-05-12T14:22:01Z"
    involvedObject:
      kind: Pod
      name: notify-596d55d887-ml42c
kind: EventList
```

### 运行与输出

```bash
python events_lab.py
```

示例输出：

```text
┏━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 命名空间:原因        ┃ 最近 5 分钟次数 ┃ 建议动作                                     ┃
┡━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ checkout:FailedScheduling │ 2            │ 查看 scheduler 日志; 检查节点 allocatable; 确认 Pod 拓扑约束 │
│ checkout:BackOff          │ 1            │ 确认镜像拉取; 查看 init 容器日志                         │
│ notification:Unhealthy    │ 1            │ 查看 readiness 探针; 查看最近发布记录; 检查 service mesh │
└──────────────────────┴──────────────┴──────────────────────────────────────────────┘
事件时间线：
[
  {
    "ns": "checkout",
    "reason": "FailedScheduling",
    "pod": "checkout-6d7bf4d7d8-2kgxk",
    "time": "2024-05-12T14:21:03Z"
  },
  ...
]
```

### 扩展版本：events_lab_pro.py
升级版脚本新增了“事件+指标”交叉视图：它会读取 `metrics.sample.json`，把 Prometheus 导出的延迟数据与事件对齐，并标出怀疑节点。

```python
# file: events_lab_pro.py
import json
from pathlib import Path
from statistics import mean

from events_lab import group, load_events, suggest_checks


def load_metrics(path: Path):
  with path.open("r", encoding="utf-8") as fh:
    return json.load(fh)


def correlate(events_path: str, metrics_path: str):
  events = load_events(Path(events_path))
  buckets = group(events)
  metrics = load_metrics(Path(metrics_path))

  for key, items in buckets.items():
    ns, reason = key.split(":")
    latency = metrics.get(ns, {}).get("p99_latency", [])
    avg_latency = round(mean(latency), 2) if latency else None
    suspect_nodes = metrics.get(ns, {}).get("suspect_nodes", [])
    print(f\"[{key}] 次数={len(items)} 平均 P99={avg_latency}ms 节点={suspect_nodes}\")
    print(\"建议动作:\", \"; \".join(suggest_checks(reason)))
    print(\"---\")


if __name__ == \"__main__\":
  correlate(\"events.sample.yaml\", \"metrics.sample.json\")
```

示例输入 `metrics.sample.json`：

```json
{
  "checkout": {
    "p99_latency": [180, 220, 210],
    "suspect_nodes": ["node-a", "node-c"]
  },
  "notification": {
    "p99_latency": [95, 102, 110],
    "suspect_nodes": ["node-b"]
  }
}
```

运行：

```bash
python events_lab_pro.py
```

示例输出：

```text
[checkout:FailedScheduling] 次数=2 平均 P99=203.33ms 节点=['node-a', 'node-c']
建议动作: 查看 scheduler 日志; 检查节点 allocatable; 确认 Pod 拓扑约束
---
[checkout:BackOff] 次数=1 平均 P99=203.33ms 节点=['node-a', 'node-c']
建议动作: 确认镜像拉取; 查看 init 容器日志
---
[notification:Unhealthy] 次数=1 平均 P99=102.33ms 节点=['node-b']
建议动作: 查看 readiness 探针; 查看最近发布记录; 检查 service mesh
---
```

## 回扣最初的误报夜晚

### 自愈节奏与未来尺度
当我们有了事件聚合脚本、指标对齐和多线程叙事模型，再回到最初那次误报夜晚，排查时间从 35 分钟降到 4 分钟。真正的收获不只是多了几个面板，而是在脑子里形成了一张“资源视图 + 流量视图 + 人机协作视图”的地图。未来随着 eBPF、OpenTelemetry、边缘集群的出现，这张地图会越来越立体。希望你在看完实验与脚本后，也能让自己的集群讲出更完整的故事；如果你也在探索 Kubernetes 可观测性，欢迎留言交流。

image_group
![可观测性协作地图](https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=800&q=80)

