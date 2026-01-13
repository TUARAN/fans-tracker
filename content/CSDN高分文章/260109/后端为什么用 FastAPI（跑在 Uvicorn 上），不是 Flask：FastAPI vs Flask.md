# 后端为什么用 FastAPI（跑在 Uvicorn 上），不是 Flask：FastAPI vs Flask

很多团队在做 Python Web 后端时，会出现一种“沟通错位”。

前端同学问：

> 你们后端用的是 Flask 吗？

后端同学回答：

> 不是，我们用的是 FastAPI，跑在 Uvicorn 上。

看起来只是换了个框架名，但落到工程细节里，它会影响：接口文档怎么生成、参数校验怎么做、并发模型怎么选、部署怎么配、以及你能不能自然地写出“类型可靠”的 API。

这篇文章不带偏见，不站队，只把核心差异讲清楚：**FastAPI 与 Flask 的定位、协议栈、开发体验、以及“为什么 FastAPI 常常要搭配 Uvicorn”**。

（示意图占位：《WSGI vs ASGI 处理链路对比》— 可谷歌搜索："wsgi vs asgi diagram"）

## 1. 先把一句话说完整：FastAPI 不是 Flask 的“替代品”，它更像一套现代 API 工程模板

Flask 的价值在于“简单、灵活、生态成熟”。

你可以把它理解成：给你一个很干净的 Web 核心，剩下你按需装配。

FastAPI 的价值在于“现代、强约束、开箱即用”。

你可以把它理解成：它更像是把 **类型系统 + 数据校验 + OpenAPI + 异步栈** 打包成一个一致的工程体验，目标是让你更快写出“可维护、可自描述”的接口。

这不是谁更强的问题，而是你要的是“自由拼装”，还是“默认最优实践”。

## 2. 本质差异 1：协议栈不同（Flask 是 WSGI 生态，FastAPI 是 ASGI 生态）

如果你只记住一件事：**Flask 默认跑在 WSGI；FastAPI 是 ASGI 框架，通常跑在 Uvicorn/Hypercorn 这类 ASGI server 上。**

- **WSGI**：为同步 Python Web 设计的接口规范。请求进来 → 同步函数处理 → 返回响应。
- **ASGI**：为异步与长连接设计的接口规范。请求进来 → 可 `async` 处理，还能自然支持 WebSocket、Server-Sent Events 等。

（示意图占位：《一次请求从 Server 到 App 的调用栈》— 可谷歌搜索："uvicorn fastapi request lifecycle"）

### 2.1 为什么 FastAPI 常常要配 Uvicorn？

因为 FastAPI 说的是“ASGI 语言”。

- Uvicorn 是常见的 ASGI Server 实现（通常基于 `uvloop`/`httptools` 等），负责把网络层的 HTTP 连接解析成 ASGI 事件，然后交给 FastAPI。
- Flask 的“官方搭配”通常是 Gunicorn / uWSGI / Waitress 这类 WSGI server。

你当然也可以用 Gunicorn 跑 FastAPI，但通常是 **Gunicorn 作为主进程管理器 + Uvicorn worker** 的组合，例如：

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 4 app:app
```

这个组合的意义是：Gunicorn 管进程与优雅重启，Uvicorn worker 负责 ASGI。

## 3. 本质差异 2：数据校验与类型系统（FastAPI 把“校验”变成默认行为）

Flask 本身不会替你做请求体结构校验。你常见的写法是：

- 自己 `request.json` 拿字段
- 手写 if/try
- 或者引入 Marshmallow、Pydantic、WTForms 等第三方库

FastAPI 则把“类型注解”当成接口契约。

你在函数签名里写清楚：

- query 参数类型
- path 参数类型
- body 的模型结构

它就会自动：

- 校验输入
- 生成 OpenAPI schema
- 把错误返回成一致的 422 响应

（示意图占位：《从 Python 类型到 OpenAPI Schema 的映射》— 可谷歌搜索："fastapi pydantic openapi schema"）

## 4. 本质差异 3：自动文档与可交互调试（FastAPI 天生“自带 API 说明书”）

Flask 可以生成文档，但一般需要额外装配：

- Flask-RESTX / Flask-RESTful + Swagger
- 或者你写一套 API 文档页面

FastAPI 默认生成：

- Swagger UI：`/docs`
- ReDoc：`/redoc`

这个能力对团队协作非常“工程化”：前端联调、测试、以及新同学 onboarding，都会更顺畅。

## 5. 本质差异 4：并发模型与性能预期（别被“异步=更快”误导）

FastAPI 支持 `async def`，并不等于你写上 async 性能就起飞。

更准确的说法是：

- **I/O 密集型**（数据库、HTTP 调用、缓存、消息队列）：ASGI + async 能更好利用单进程的并发能力。
- **CPU 密集型**（加密、图像处理、特征提取、复杂计算）：async 没用，应该上多进程/任务队列/专门计算服务。

Flask 也能跑得很快：

- 用 Gunicorn 多 worker
- 用更高效的序列化
- 把热点逻辑下沉

所以差异更像是“并发能力的上限与工程默认路径”，而不是“单点性能的魔法”。

## 6. 本质差异 5：依赖注入与可测试性（FastAPI 的 Depends 很像一套轻量 DI）

Flask 常见的做法是：

- 用全局对象（`g`、app context）
- 或者手动传参、手动构建 service

FastAPI 的 `Depends` 能让你把“横切关注点”写成可组合模块：

- 认证
- 数据库 session
- 配置
- 速率限制（需自己实现/集成）

这会明显影响代码结构：FastAPI 更容易写出“层次更清楚、单测更干净”的接口。

## 7. 最小可复现实验：同一个接口，Flask 与 FastAPI 的差别一眼看懂

下面给你一套“复制就能跑”的对比实验。

目标：实现一个 `POST /users`，接收 JSON 并返回校验结果。

### 7.1 环境准备

建议新建虚拟环境：

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
```

安装依赖：

```bash
pip install fastapi uvicorn flask
```

### 7.2 Flask 版本（手写校验）

新建 `flask_app.py`：

```python
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.post("/users")
def create_user():
    data = request.get_json(silent=True) or {}

    # 手写校验（仅演示思路）
    name = data.get("name")
    age = data.get("age")

    if not isinstance(name, str) or not name.strip():
        return jsonify({"error": "name 必须是非空字符串"}), 400

    if not isinstance(age, int) or age < 0:
        return jsonify({"error": "age 必须是非负整数"}), 400

    return jsonify({"id": 1, "name": name, "age": age})


if __name__ == "__main__":
    # 开发服务器：仅用于本地调试
    app.run(host="127.0.0.1", port=5000, debug=True)
```

启动：

```bash
python flask_app.py
```

测试：

```bash
curl -s -X POST http://127.0.0.1:5000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","age":18}'
```

预期输出（示例）：

```json
{"age":18,"id":1,"name":"Ada"}
```

试一个错误输入：

```bash
curl -s -X POST http://127.0.0.1:5000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"","age":-1}'
```

你会得到你手写的错误信息（400）。

### 7.3 FastAPI 版本（类型即契约）

新建 `fastapi_app.py`：

```python
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="FastAPI vs Flask Demo")


class UserIn(BaseModel):
    name: str = Field(min_length=1)
    age: int = Field(ge=0)


class UserOut(BaseModel):
    id: int
    name: str
    age: int


@app.post("/users", response_model=UserOut)
async def create_user(user: UserIn):
    # 这里 user 已经校验过了
    return UserOut(id=1, name=user.name, age=user.age)
```

启动（这就是“跑在 Uvicorn 上”的那句）：

```bash
uvicorn fastapi_app:app --host 127.0.0.1 --port 8000 --reload
```

访问文档：

- Swagger UI：http://127.0.0.1:8000/docs
- ReDoc：http://127.0.0.1:8000/redoc

测试同样请求：

```bash
curl -s -X POST http://127.0.0.1:8000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","age":18}'
```

预期输出（示例）：

```json
{"id":1,"name":"Ada","age":18}
```

再试错误输入：

```bash
curl -s -X POST http://127.0.0.1:8000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"","age":-1}'
```

你会得到一个结构化的 422 响应，包含每个字段的错误位置与原因。

（示意图占位：《422 Validation Error 示例结构》— 可谷歌搜索："fastapi 422 validation error example"）

## 8. 工程选择建议：什么时候用 FastAPI，什么时候 Flask 依然更香

如果你的项目满足这些特点，FastAPI 往往更顺手：

- API 为主（尤其是面向前端/移动端/第三方调用）
- 强依赖接口契约与文档（OpenAPI/Swagger）
- 输入输出结构复杂，需要稳定的校验与错误返回
- 有异步 I/O 的需求（例如大量外部 HTTP 调用、WebSocket、流式响应）

如果你的项目满足这些特点，Flask 依然很合适：

- 小而快的内部工具、管理后台、原型验证
- 团队已有成熟 Flask 生态与中间件沉淀
- 你更希望“框架少管我”，由你决定一切约束

这也是为什么很多团队会说：

> 我们后端用 FastAPI（Uvicorn 上跑），因为我们需要的是一套现代 API 的默认工程能力。

而不是因为 Flask “不行”。

## 9. 回到开头：为什么要澄清“不是 Flask”这件事

当你说“后端是 FastAPI（Uvicorn）”，你其实是在告诉团队一件更重要的事：

- 这套服务默认遵循 ASGI 的并发模型
- 接口契约与校验是第一等公民
- 文档与联调链路是开箱即用的一部分

把这三点对齐，很多沟通成本会立刻下降。

如果你也在团队里反复解释“FastAPI 和 Flask 到底差在哪”，欢迎留言交流：你们是因为什么场景从 Flask 迁到 FastAPI（或反过来）的？
