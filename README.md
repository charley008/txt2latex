# 言式 · Text to LaTeX

本程序由 CODEX + GPT-6.1SOL 开发。

将中文、英文自然语言转为 LaTeX 的独立网站。React + KaTeX 前端，容器由 Nginx 提供静态网页和健康检查，单个 Docker 容器部署。默认使用 Chrome 内置 Gemini Nano 在本机转换；也可自行配置 DeepSeek 等支持 OpenAI 兼容 Chat Completions 接口的服务，使用各自的 API Key。

## Docker 部署

```powershell
Copy-Item .env.example .env
# .env 只需配置端口，API Key 在各自浏览器填写
docker compose up -d --build
```

Linux / WSL 下第一步用 `cp .env.example .env`。访问 http://localhost:8080 。修改端口设置 `WEB_PORT`，AI 地址、模型和 Key 在各自浏览器的接口设置中填写。支持提供商的基础地址或完整 `/chat/completions` 路径。修改环境变量后运行 `docker compose up -d`。

```powershell
docker compose logs -f
docker compose down
```

容器内部监听 3000，默认映射到宿主机 8080。网页与 `/api/health` 健康检查由同一个 Nginx 服务提供，无需额外容器。公式渲染资源随镜像构建，界面使用系统字体。

### 低内存运行

Node.js 仅用于构建前端，最终镜像使用非 root 用户运行单 worker Nginx，不再常驻 Node.js，也不会每 30 秒启动 Node.js 做健康检查。AI 和公式渲染都在浏览器中运行，VPS 只提供静态文件。实际内存取决于访问量和 Docker 的统计方式，可在启动后查看：

```sh
docker compose stats --no-stream
```

WSL2 / Ubuntu、Docker linux/amd64 对比：两版均启用 `init`，各处理 500 次请求（10 并发），完成自动健康检查后，`docker stats` 显示旧 Node.js 容器约 38.73 MiB，新 Nginx 容器约 5.25 MiB，降低约 86%。这是本地对比结果，VPS 上需按相同统计口径复测；进程 RSS 与 `docker stats` 数字不同。

从源码更新部署：

```sh
docker compose up -d --build
```

使用 `compose.hub.yaml` 的部署，需要等新版镜像发布后再更新，并使用新版 Compose 文件（健康检查已改为 `wget`）：

```sh
docker compose -f compose.hub.yaml pull
docker compose -f compose.hub.yaml up -d
```

已有 Nginx 的用户，也可以直接托管 `npm run build` 生成的 `dist/`，省去本项目的独立容器。

### 接入你现有的 Nginx

在你自己的 Nginx 站点中，将整个网站代理到宿主机端口即可（Nginx 在宿主机运行时示例如下）：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 75s;
}
```

若 Nginx 也在容器中运行，请使用它能访问的宿主机地址或共享 Docker 网络中的服务名，不能使用该容器自身的 `127.0.0.1`。域名与 HTTPS 在你现有的 Nginx 中自行配置。

### 使用现有域名的子路径

支持 `https://你的域名/txt2latex/`，无需新增子域名。在现有 HTTPS 站点的 server 中加入：

```nginx
location = /txt2latex {
    return 301 /txt2latex/;
}

location /txt2latex/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`proxy_pass` 末尾的 `/` 必须保留，用于去掉上游请求中的 `/txt2latex/` 前缀；入口也需以 `/` 结尾。静态资源使用相对路径，同一镜像兼容根路径和子路径。Chrome 本地 AI 需要 HTTPS（localhost 除外）。Nginx 在容器内运行时，将上游地址替换为它能访问的宿主机地址。

## 功能介绍

- 输入自然语言，生成 LaTeX 数学公式，支持实时预览和源码编辑。
- 支持行内、块级和纯 LaTeX 格式，可复制、下载并查看本机历史记录。
- 简单公式可使用 Chrome 内置本地模型，无需 API Key；复杂公式建议使用 DeepSeek 等云端模型，自行填写 API 地址、模型和 Key。
- 支持浅色、深色模式。生成结果请核对数学含义。

## 本地开发

需要 Node.js 22+，Windows 使用 npm.cmd 避免脚本策略限制。

```powershell
npm.cmd ci
npm.cmd run dev
```

开发和生产均访问 http://localhost:3000 。开发运行 `npm.cmd run dev`；本地生产预览先运行 `npm.cmd run build`，再运行 `npm.cmd start`（使用 Node.js；Docker 运行阶段使用 Nginx）。两种模式任选一种启动，不要同时运行。端口被占用时开发服务会报错，不会自动切换端口。测试运行 `npm.cmd test`。Docker 默认对外映射为 8080，容器内部仍为 3000。

有 Docker 的环境可运行 `npm run test:container`，自动构建镜像并检查页面、JS/CSS、字体、API 响应、健康检查及非 root 用户；测试容器结束后自动删除。

## 特别鸣谢

[ArronHC/Text2Math](https://github.com/ArronHC/Text2Math)
