# 言式 · Text to LaTeX

本程序由 CODEX + GPT-6.1SOL 开发。

将中文、英文自然语言转为 LaTeX 的独立网站。React + KaTeX 前端，Node.js 提供静态网页和健康检查，单个 Docker 容器部署。默认使用 Chrome 内置 Gemini Nano 在本机转换；也可自行配置 DeepSeek 等支持 OpenAI 兼容 Chat Completions 接口的服务，使用各自的 API Key。

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

容器内部监听 3000，默认映射到宿主机 8080。网页与 `/api/health` 健康检查由同一个 Node.js 服务提供，无需额外的 Nginx 容器。公式渲染资源随镜像构建，界面使用系统字体。

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

开发和生产均访问 http://localhost:3000 。开发运行 `npm.cmd run dev`；生产先运行 `npm.cmd run build`，再运行 `npm.cmd start`。两种模式任选一种启动，不要同时运行。端口被占用时开发服务会报错，不会自动切换端口。测试运行 `npm.cmd test`。Docker 默认对外映射为 8080，容器内部仍为 3000。

## 特别鸣谢

[ArronHC/Text2Math](https://github.com/ArronHC/Text2Math)
