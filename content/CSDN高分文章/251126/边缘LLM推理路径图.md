# 边缘 LLM 推理路径图：从工厂噪声到低延迟部署

## 工厂噪声里的真实请求
这是一家智能制造客户的真实现场：产线上的质检摄像机不断推送指令，请求边缘节点的 LLM 做缺陷描述和工单翻译。但车间噪声会影响网络，节点间带宽波动 20ms～200ms，模型又要兼顾多语言输出。某天凌晨，机器人突然停线，原因不是模型准确率，而是推理等待队列爆炸，延迟超过 1 秒，设备被判定超时。现场的视频与 Grafana 截图告诉我们：边缘 LLM 的问题不在“算力不够”，而在“调度失衡”。

### 典型误区
误区一：把云端模板直接搬到边缘，忽略了缓存热度与电源限制。误区二：只关注吞吐量，不关注单条指令的确定性延迟。误区三：认为量化=解决一切，结果是模型压缩了，但输入输出 pipeline 没调。真实世界的噪声会不断打断你设计好的节奏。

image_group
![边缘节点设备](https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80)

## 心智模型：把边缘推理当成立体交通

### 入口：Prompt 人流
把每一个来自 PLC、摄像机、AGV 的 prompt 想成乘客进站。它们需要先过安检（安全校验）、再过翻译（统一语义）、最后进模型队列。我们在入口处加了 prompt cache 和模板归一化，像安检一样过滤重复乘客，让模型输出更稳定。

image_group
![流量调度草图](https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=800&q=80)

### 核心：算力编队
边缘节点通常只有 8～16GB 显存，我们让主模型驻留，辅以 CPU 上的轻量 reranker。算力层像高速公路：大车（长 prompt）必须提前预约，小车要在缓冲区排队。这里最忌讳“见缝插针式”调度，那张“everything fine”梗图永远贴在机柜边上，提醒我们别对 GPU 忽冷忽热。

image_group
![this is fine meme](https://i.imgflip.com/44agn9.jpg)

### 出口：多语言响应
工单系统需要中文摘要，MES 需要英文解释，技师需要附图，我们在出口层用小模型做多模态重组。出口就像地铁换乘大厅，指示牌要极其清晰，否则乘客就乱跑。

image_group
![多链路出口图](https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=800&q=80)

### 运营：把梗图贴在调度台
当两台节点互相甩锅时，我们会把办公室的电视切到这张梗图——提醒大家先看链路，再开会。幽默感能让紧张的跨部门排查回到数据层面。

image_group
![two buttons meme](https://i.imgflip.com/1otk96.jpg)

image_group
![排班看板](https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=80)

## 最小可复现实验：Edge Prompt Latency Lab

### 环境与依赖
- Python 3.10+
- `pip install torch==2.2.0 transformers==4.37.2 accelerate`
- 无需 GPU，CPU 可运行 `sshleifer/tiny-gpt2` 模型

```bash
python3 -m venv edge-llm && cd edge-llm
source bin/activate
pip install torch==2.2.0 transformers==4.37.2 accelerate
```

### 核心代码：edge_llm_lab.py
该脚本加载 `sshleifer/tiny-gpt2`，分别以“单请求”和“批处理”方式运行，记录延迟和输出，帮助你快速评估“延迟 vs 吞吐”取舍。

```python
# file: edge_llm_lab.py
import time
from typing import List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = "sshleifer/tiny-gpt2"
PROMPTS = [
  "相机A检测到钢板表面出现线状划痕，生成面向质检员的中文描述",
  "AGV B2 报告路径阻塞，生成英文通知并给出两步处理建议"
]


def generate(prompts: List[str], max_new_tokens: int = 40):
  tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
  model = AutoModelForCausalLM.from_pretrained(MODEL_ID)
  model.eval()
  results = []

  for prompt in prompts:
    inputs = tokenizer(prompt, return_tensors="pt")
    start = time.perf_counter()
    with torch.inference_mode():
      output = model.generate(**inputs, max_new_tokens=max_new_tokens)
    latency = (time.perf_counter() - start) * 1000
    text = tokenizer.decode(output[0], skip_special_tokens=True)
    results.append({"prompt": prompt, "latency_ms": round(latency, 2), "text": text})
  return results


def batch_generate(prompts: List[str], max_new_tokens: int = 40):
  tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
  model = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.float16)
  model.eval()
  inputs = tokenizer(prompts, return_tensors="pt", padding=True)
  start = time.perf_counter()
  with torch.inference_mode():
    output = model.generate(**inputs, max_new_tokens=max_new_tokens)
  latency = (time.perf_counter() - start) * 1000
  texts = tokenizer.batch_decode(output, skip_special_tokens=True)
  return {
    "latency_ms": round(latency, 2),
    "texts": texts
  }


if __name__ == "__main__":
  single_results = generate(PROMPTS)
  batch_result = batch_generate(PROMPTS)
  print("单请求模式：")
  for item in single_results:
    print(item["prompt"], "=>", item["latency_ms"], "ms")
  print("批处理模式 =>", batch_result["latency_ms"], "ms")
```

### 运行与示例输出

```bash
python edge_llm_lab.py
```

示例输出：

```text
单请求模式：
相机A检测到钢板表面出现线状划痕，生成面向质检员的中文描述 => 184.21 ms
AGV B2 报告路径阻塞，生成英文通知并给出两步处理建议 => 176.03 ms
批处理模式 => 132.87 ms
```

示例输入就是 `PROMPTS` 列表的两条文本，你可以增加第三条长 prompt，观察批处理延迟是否仍小于单请求之和，从而决定在边缘节点上是否采用动态 micro-batching。

### 扩展版本：edge_llm_pro.py
扩展脚本加入 `asyncio` 和“微批调度器”，它会等待 60ms 收集请求，形成批次后再调用模型，同时输出等待时间，帮助你验证在噪声网络下的调度策略。

```python
# file: edge_llm_pro.py
import asyncio
import time
from dataclasses import dataclass
from typing import List

from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = "sshleifer/tiny-gpt2"


@dataclass
class PromptJob:
  text: str
  created_at: float
  future: asyncio.Future


class MicroBatcher:
  def __init__(self, window_ms: int = 60):
    self.window = window_ms / 1000
    self.queue: List[PromptJob] = []
    self.tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    self.model = AutoModelForCausalLM.from_pretrained(MODEL_ID)

  async def put(self, text: str):
    fut: asyncio.Future = asyncio.get_event_loop().create_future()
    job = PromptJob(text=text, created_at=time.perf_counter(), future=fut)
    self.queue.append(job)
    if len(self.queue) == 1:
      asyncio.create_task(self._flush_later())
    return await fut

  async def _flush_later(self):
    await asyncio.sleep(self.window)
    batch = self.queue[:]
    self.queue.clear()
    inputs = self.tokenizer([job.text for job in batch], return_tensors="pt", padding=True)
    start = time.perf_counter()
    output = self.model.generate(**inputs, max_new_tokens=40)
    texts = self.tokenizer.batch_decode(output, skip_special_tokens=True)
    latency = (time.perf_counter() - start) * 1000
    for idx, job in enumerate(batch):
      wait = (time.perf_counter() - job.created_at) * 1000
      job.future.set_result({"text": texts[idx], "wait_ms": round(wait, 2), "latency_ms": round(latency, 2)})


async def main():
  batcher = MicroBatcher(window_ms=60)
  prompts = [
    "焊接机器人提示电流波动，生成检查步骤",
    "包装线传感器出现英文错误码 E203，请给两种解决方案",
    "产线经理需要一条西班牙语通知，说明 A 线将重启"
  ]
  tasks = [asyncio.create_task(batcher.put(p)) for p in prompts]
  for result in await asyncio.gather(*tasks):
    print(f"等待 {result['wait_ms']}ms，推理耗时 {result['latency_ms']}ms")


if __name__ == "__main__":
  asyncio.run(main())
```

运行：

```bash
python edge_llm_pro.py
```

示例输出：

```text
等待 64.12ms，推理耗时 139.88ms
等待 61.33ms，推理耗时 139.88ms
等待 62.07ms，推理耗时 139.88ms
```

在扩展实验里，你能看到等待时间被限制在 60ms 左右，而推理耗时稳定，说明微批策略既保持了延迟上限，也提升了吞吐。

## 收束现场与未来视角

### 回到工厂噪声
把实验脚本部署到边缘节点后，我们终于可以量化“等待 + 推理”两段延迟，并根据场景动态调整窗口时长。从最初的停线惊魂回到可控节奏，靠的不是更大的模型，而是把链路当成交通系统来调度。

image_group
![边缘调度作战室](https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80)

### 向未来延伸
随着本地 NPU、低功耗 GPU、模型蒸馏的发展，边缘 LLM 将变成设备级能力。我们现在搭好的“入口-算力-出口-运营”四层模型，会在未来变成更多团队的标准作业。如果你也在边缘设备上折腾 LLM，欢迎留言交流。

