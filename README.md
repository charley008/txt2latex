# 言式 · Text to LaTeX

将中文、英文自然语言转为 LaTeX 的独立网站。React + KaTeX 前端，Node.js 提供静态网页和健康检查，单个 Docker 容器部署。默认使用 Chrome 内置 Gemini Nano 在本机转换；也可自行配置 DeepSeek 等支持 OpenAI 兼容 Chat Completions 接口的服务，使用各自的 API Key。

## Docker 部署

```powershell
Copy-Item .env.example .env
# .env 只需配置端口，API Key 在各自浏览器填写
docker compose up -d --build
```

Linux / WSL 下第一步用 `cp .env.example .env`。访问 http://localhost:8080 。修改端口设置 `WEB_PORT`，AI 地址、模型和 Key 在各自浏览器的接口设置中填写。地址填写到 `/v1` 或提供商要求的基础路径，不要包含 `/chat/completions`。修改环境变量后运行 `docker compose up -d`。

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

## 使用方法与隐私

- 默认使用 Chrome 内置 Gemini Nano，通过 Prompt API 在浏览器本机推理。中文描述与中文额外要求会先通过内置 Translator API 翻译为英文；英文输入跳过翻译。翻译前保护变量大小写、下标、明确的幂次和积分术语，翻译后恢复；若翻译丢失受保护符号则停止并提示。页面可展开查看英文译文，翻译与推理均在本机进行。简单公式可尝试本地模型，复杂公式建议使用自己配置的云端模型并核对结果。点击生成后才可能触发首次模型下载，界面显示进度。不支持时会提示，不会自动切换云端。
- 需要支持 Prompt API 的桌面 Chrome、符合条件的硬件，以及 HTTPS 或 localhost。普通 HTTP 局域网地址不可用。中文输入需要浏览器支持中文到英文的 Translator API，首次使用可能下载翻译资源；翻译可能改变数学含义，需核对英文译文与结果，本地模型不能保证替代 DeepSeek。
- 手动选择「我的云端 API」，在接口设置中填写自己的基础地址、模型、Key。浏览器直接请求提供商；提供商必须支持 CORS，本站不提供代理。云端模式会把描述和 Key 发送给你设置的提供商。
- Key 默认只保留在页面内存，刷新清除。勾选「在此浏览器记住 Key」后，明文保存到该站点的 localStorage；共用电脑不建议开启。可一键清除本机 API 配置。
- 模型选择默认仍为本地；云端地址、模型与选择保存的 Key 仅属于当前浏览器配置文件，不会共享给其他访客或同步到本站服务器。同一浏览器配置文件的其他使用者仍可能访问保存的数据。
- 历史记录最多 12 条，仅保存在当前浏览器，可清空。页面无外部字体、统计或云端存储请求。服务器仅提供静态资源和健康检查，不接收 AI 转换请求，不读取旧的 AI_API_KEY 环境变量。
- 编辑源码可实时预览，支持行内 / 块级 / 纯 LaTeX、复制和下载。AI 结果请核对。

## 本地开发

需要 Node.js 22+，Windows 使用 npm.cmd 避免脚本策略限制。

```powershell
npm.cmd ci
npm.cmd run dev
```

访问 http://localhost:5173 。不需要 API 后端。生产构建 `npm.cmd run build`，随后 `npm.cmd start` 在 3000 提供静态网页。测试 `npm.cmd test` 覆盖本地模型生命周期、个人密钥保存规则、云端直连协议及共享 API 移除；真实模型质量与云端 CORS 仍需在目标浏览器验证。

## 特别鸣谢

[ArronHC/Text2Math](https://github.com/ArronHC/Text2Math)
