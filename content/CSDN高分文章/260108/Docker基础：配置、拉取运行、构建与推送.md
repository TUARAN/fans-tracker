# Docker 基础：怎么配置、怎么拉取运行、怎么构建推送（把容器当成“可复制的运行环境”）

很多人第一次接触 Docker，是在同事发来一句话：

> 你别装环境了，直接 `docker run` 就行。

然后你半信半疑地敲下命令，程序居然真的跑起来了。

Docker 最迷人的地方就在这里：**它把“环境”从你的电脑里抽离出来，变成一个可以复制、可以分发、可以回滚的交付物**。这篇文章不讲太多玄学，专门解决三件事：

- Docker 怎么安装/配置
- 镜像怎么拉取与运行
- 镜像怎么构建与推送

（示意图占位：《Image / Container / Registry 关系图》— 可谷歌搜索："docker image container registry diagram"）

## 1. 先把三个概念说清楚：Image、Container、Registry

很多 Docker 的困惑，其实来自“名词没对齐”。

- **镜像（Image）**：只读模板，包含文件系统快照 + 元数据。你可以把它理解成“可执行的软件安装包 + 环境”。
- **容器（Container）**：镜像运行起来后的实例。镜像是“类”，容器是“对象”。
- **仓库（Registry）**：存镜像的地方，比如 Docker Hub、GitHub Container Registry（GHCR）、阿里云镜像仓库。

在日常命令里，它们对应的是：

- `docker pull nginx:alpine` → 拉镜像
- `docker run ... nginx:alpine` → 用镜像启动一个容器
- `docker push yourname/app:tag` → 把你构建出来的镜像推到仓库

## 2. 安装与基本配置（macOS 直接用 Docker Desktop）

你在 macOS 上最省心的方式是 Docker Desktop。

安装完成后建议做两件“小配置”，能少踩很多坑：

1) **资源限制（CPU/内存）**

Docker Desktop 本质是在本机启动一个 Linux VM 来跑容器。如果你发现电脑风扇狂转、前端 dev server 卡顿，先去把 CPU/内存调小一点。

2) **镜像加速（可选）**

如果你拉镜像很慢，可以配置镜像加速地址（不同网络环境差异很大）。如果你不确定要不要配：先不配，遇到慢再处理。

验证安装是否成功：

```bash
docker version
docker info
```

## 3. 最小可复现实验：3 分钟跑起来一个 Web 服务

这部分是“拿来就能跑”的实验：不用写代码，不用装 Nginx。

### 3.1 拉取镜像

```bash
docker pull nginx:alpine
```

### 3.2 运行容器并映射端口

```bash
docker run --name demo-nginx -p 8080:80 -d nginx:alpine
```

解释一下这条命令：

- `--name demo-nginx`：给容器取个好记的名字
- `-p 8080:80`：把宿主机 8080 映射到容器 80
- `-d`：后台运行（detached）
- `nginx:alpine`：镜像名:tag

打开浏览器访问：

- `http://localhost:8080`

你应该能看到 Nginx 默认欢迎页。

### 3.3 常用排查命令（必背）

```bash
# 看正在运行的容器
docker ps

# 看所有容器（包含停止的）
docker ps -a

# 看日志
docker logs -f demo-nginx

# 进入容器（调试）
docker exec -it demo-nginx sh

# 停止/启动/删除
docker stop demo-nginx
docker start demo-nginx
docker rm demo-nginx
```

如果你只记住一条：**排障先看 `docker logs`，调试再用 `docker exec` 进去看。**

## 4. 数据与文件：容器是“临时的”，持久化要靠 Volume/Bind Mount

新手最容易误解的是：

> 我把数据写进容器了，怎么删掉容器就没了？

因为容器的可写层是“临时工作区”，删除容器就等于丢掉这层。

你要持久化，通常有两种方式：

- **Bind mount（绑定宿主机目录）**：开发时最常见，直接把本机目录挂进去。
- **Volume（Docker 管理的卷）**：更偏生产，路径由 Docker 管，迁移与备份更标准。

举个最直观的例子：给 Nginx 挂一个本地静态目录。

```bash
mkdir -p ./site
printf '<h1>Hello from Docker</h1>' > ./site/index.html

docker run --name site-nginx -p 8081:80 -d \
  -v "$PWD/site":/usr/share/nginx/html:ro \
  nginx:alpine
```

访问 `http://localhost:8081`，你看到的就是本机 `./site/index.html`。

## 5. 镜像构建：Dockerfile 就是“可复现环境的配方”

如果说 `docker run` 是“拿现成的镜像跑”，那 `docker build` 就是“把你的项目打包成镜像”。

Dockerfile 的常见结构：

- 选基础镜像（`FROM`）
- 复制文件（`COPY`）
- 安装依赖（`RUN`）
- 指定启动命令（`CMD`）

（示意图占位：《Dockerfile 分层缓存机制》— 可谷歌搜索："docker layer cache diagram"）

### 5.1 最小示例：把一个静态站点打包成镜像

在任意目录创建 `Dockerfile`：

```dockerfile
FROM nginx:alpine
COPY ./site /usr/share/nginx/html
```

构建：

```bash
docker build -t demo-site:1.0 .
```

运行：

```bash
docker run --rm -p 8082:80 demo-site:1.0
```

这里的关键点是：**镜像 = 你交付的单位**。一旦镜像构建成功，它在任何装了 Docker 的机器上都能跑出一致行为。

### 5.2 常见加速点：缓存与 `.dockerignore`

构建慢通常不是 Docker 慢，是你把不该打包的东西塞进了 build context。

建议加一个 `.dockerignore`（按项目调整）：

```text
node_modules
.dist
.git
.DS_Store
```

## 6. 镜像 tag：你推送的不是“latest”，而是“可回滚的版本”

`tag` 决定你未来能不能稳定回滚。

建议你在团队里把 tag 当成“版本号/提交号”：

- `yourapp:1.0.0`
- `yourapp:20260108`
- `yourapp:git-<shortsha>`

`latest` 不是不能用，但它更像一个“移动指针”，适合给人类方便，不适合当作部署的唯一依据。

## 7. 推送镜像：Docker Hub / GHCR 的基本流程

推送镜像的本质是两步：

1) 让镜像名字符合仓库命名空间
2) 登录并 push

### 7.1 推送到 Docker Hub

前置条件：你有 Docker Hub 账号（用户名假设为 `yourname`）。

给本地镜像打 tag（注意：名字里要带上命名空间）：

```bash
# 先构建一个镜像（示例）
docker build -t demo-site:1.0 .

# 再打一个用于推送的 tag
docker tag demo-site:1.0 yourname/demo-site:1.0
```

登录：

```bash
docker login
```

推送：

```bash
docker push yourname/demo-site:1.0
```

验证拉取：

```bash
docker pull yourname/demo-site:1.0
```

### 7.2 推送到 GitHub Container Registry（GHCR）

GHCR 的镜像名通常长这样：

- `ghcr.io/<owner>/<image>:<tag>`

示例：

```bash
# 需要一个 GitHub PAT（有 packages:write 权限）
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin

docker tag demo-site:1.0 ghcr.io/<owner>/demo-site:1.0
docker push ghcr.io/<owner>/demo-site:1.0
```

你在团队里用 GHCR 的优势是：代码与镜像都在同一个平台，权限管理更统一。

## 8. 你真正需要记住的“Docker 心智模型”

当你把 Docker 用熟，会发现你每天都在做一件事：

> 把“在我电脑上能跑”变成“在哪台机器上都能跑”。

最短路径是：

- 运行：`pull` → `run` → `logs` → `stop/rm`
- 交付：`build` → `tag` → `push` →（服务器）`pull` → `run`

如果你接下来希望把这个仓库（Vite SPA）用 Docker/Nginx 部署，我也可以直接给你补齐：`Dockerfile`、`nginx.conf`、以及一条 `docker run` 或 `docker compose` 的发布脚本，让“发布”变成一条命令。