# 众智工场（Zhongzhi Factory）

众智工场是面向算法模型供需双方的独立网站。买家可以浏览算法市场、查看商品详情、收藏、咨询供应商和在线试用；供应商可以创建并续编草稿、编辑商品信息、查看及下载生成源码、回复咨询，并配置试用服务。网站还提供登录、注册和「帮我找算法」入口。订单、定价与平台认证尚未开放。

这是一个独立的 React 单页应用，通过 HTTP 调用 `ioeb_backend` 的 `/api` 接口及可选的 `Micro-Agent` 智能体接口。仓库仅包含前端；后端及智能体需分别部署。默认开发代理和容器 Nginx 代理均指向 `https://fdueblab.cn`。草稿、消息和源码权限依赖配套的 `ioeb_backend` 更新，发布新网站前须先部署配套后端。

## 技术栈

- React 18、TypeScript、Vite 6、React Router 7
- Tailwind CSS 4、Axios、Lucide React
- Node.js 20、npm（以 `package-lock.json` 锁定依赖）
- 生产环境：Docker 多阶段构建 + Nginx

## 代码结构

```text
zhongzhi-factory/
├─ src/
│  ├─ api/                 # HTTP 客户端、认证、商品和智能体接口
│  ├─ auth/                # 登录状态与受保护路由
│  ├─ app/                 # 路由入口及预留的通用 UI 组件
│  ├─ components/          # 页面共用布局与商品组件
│  ├─ lib/                 # 数据映射、本地状态和场景配置
│  ├─ pages/               # 买家页面与 supplier/ 供应商页面
│  ├─ styles/              # 全局样式与主题
│  └─ main.tsx             # 浏览器入口
├─ public/                 # 原样复制到站点根目录的静态文件
├─ .env.example            # 开发环境配置示例
├─ vite.config.ts          # Vite 开发服务与 API 代理
├─ Dockerfile              # 前端构建和 Nginx 运行镜像
├─ nginx.conf              # SPA 路由回退与生产 API 代理
├─ docker-compose.yml      # 单容器部署，宿主机端口 8088
└─ .github/workflows/ci.yml # main 推送和 PR 的构建检查
```

## 拉取并在本地运行

前提：安装 Node.js 20 和 npm。以下命令以 Windows PowerShell 为例；若 PowerShell 禁止运行 `npm.ps1`，使用 `npm.cmd` 即可。在 macOS/Linux 上把 `npm.cmd` 换成 `npm`。

```powershell
git clone <本仓库的 GitHub HTTPS 或 SSH 地址>
cd zhongzhi-factory
npm.cmd ci
npm.cmd run dev
```

浏览器打开终端显示的地址，通常为 <http://localhost:5173>。停止服务按 `Ctrl+C`。已有代码时，先 `git pull --ff-only`，再根据锁文件变化运行 `npm.cmd ci`。

不创建环境文件时，代码中的默认值会连接线上接口。`.env.example` 列出了可配置项；需要覆盖时，将其复制为不会提交的 `.env.development`：

```powershell
Copy-Item .env.example .env.development
```

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | 浏览器调用后端的 URL 前缀 |
| `VITE_AGENT_BASE_URL` | 空 | 智能体接口的浏览器 URL 前缀，留空时沿用同源 `/api/agent` |
| `VITE_DEV_API_PROXY` | `https://fdueblab.cn` | Vite 将 `/api` 转发到的后端 |
| `VITE_DEV_AGENT_PROXY` | `https://fdueblab.cn` | Vite 将 `/api/agent` 转发到的智能体服务 |

本地联调后端时，可在 `.env.development` 中设为 `http://127.0.0.1:5000` 和 `http://127.0.0.1:8010`。代理配置变更后重启开发服务。`VITE_` 变量会进入前端构建产物，不能放密码或密钥。

## 构建与验证

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

`build` 生成 `dist/`；`preview` 仅用于本地检查构建结果，生产部署请使用下述 Docker/Nginx 流程。GitHub Actions 会在推送 `main` 和提交到 `main` 的拉取请求时执行 `npm ci`、`npm run typecheck`、`npm run build`。

## 生产部署

服务器需要安装 Git 和 Docker（含 Compose 插件），并能访问 npm 镜像源与 `https://fdueblab.cn`。在服务器克隆仓库后执行：

```bash
git clone <本仓库的 GitHub HTTPS 或 SSH 地址>
cd zhongzhi-factory
docker compose up -d --build
docker compose ps
```

默认映射为服务器的 `8088` 端口，访问 `http://<服务器 IP>:8088`。Dockerfile 以 `npm ci` 安装锁定依赖、构建前端，再由 Nginx 提供静态文件。`nginx.conf` 为 React 路由配置了 `index.html` 回退，并把 `/api/agent/` 和 `/api/` 反向代理到 `https://fdueblab.cn`。

若要绑定正式域名和 HTTPS，请在服务器入口反向代理中把域名转发到本服务的 `8088` 端口，并配置 TLS 证书；同时按需调整服务器防火墙和 `docker-compose.yml` 的端口映射。若生产 API 不在 `fdueblab.cn`，部署前修改 `nginx.conf` 的两处 `proxy_pass` 及对应 `Host` 请求头，然后重新构建镜像。不要仅修改 `.env.development`：它只影响本地 Vite 开发服务。

更新部署：

```bash
cd zhongzhi-factory
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 zhongzhi-frontend
```

发布后检查首页、直接刷新 `/market` 等子路由，以及登录和 API 请求是否正常。需要回退时，检出上一个已验证的提交并重新执行 `docker compose up -d --build`；不要在生产服务器直接修改源代码。

## Git 工作流

1. 从最新的 `main` 创建功能分支：`git switch main`、`git pull --ff-only`、`git switch -c feat/<简短名称>`。修复分支可用 `fix/<简短名称>`。
2. 在分支开发并运行 `npm ci`、`npm run typecheck`、`npm run build`；提交时只加入相关文件，提交说明可采用 `feat: ...`、`fix: ...`、`docs: ...`。
3. 推送分支：`git push -u origin <分支名>`，在 GitHub 发起指向 `main` 的 Pull Request。说明改动、验证步骤，以及涉及的配置或部署影响。
4. 等待 CI 通过并完成代码审查后合并。部署只从 `main` 的已验证提交进行；紧急修复也通过修复分支和 PR 回到 `main`。

不要提交 `node_modules/`、`dist/`、本地 `.env.development`、`.env.local` 或包含密钥的文件；依赖变化时提交 `package.json` 和 `package-lock.json`。

## 与既有平台的关系

本项目与旧版 `ioeb` Vue 前端并行；通过 REST API 消费 `ioeb_backend`，并按需调用 `Micro-Agent`。该仓库的构建与部署不依赖旧前端仓库。第三方素材与组件来源见 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。

## 当前功能与后端配套

- 买家：引导式需求填写和市场检索、收藏列表、商品咨询、消息中心、已配置服务的在线试用。商品详情支持导入最多 20 条 JSON 用例进行浏览器端批量测评，按预期 JSON 比较输出；测评结果不会保存到服务器。
- 供应商：服务端草稿、续编和发布，已登记商品编辑，消息回复，生成源码查看与下载。
- `ioeb_backend` 需要提供 `/api/services/mine`、`/api/services/<id>`、`/api/services/scenario-generated/upload`（支持 `draft_id`）、`/api/services/<id>/scenario-generated-code`、收藏关系接口及 `/api/messages/user` 等接口。源码下载只允许成果创建者，草稿仅创建者可见。
- 保存草稿时，表单内容暂存于服务的 `source.companyIntroduce` 字段，使用 `ZZF_DRAFT_V1:` 前缀；文件和生成结果不随草稿保存，续编后需重新选择或生成。部署前应验证数据库字段容量能够容纳实际表单内容。
- AI 生成或上传源码登记成功后，成果初始状态是 `not_deployed`。在线试用还需要供应商配置可访问的运行端点并部署服务。源码页仅显示已保存的 Python 源码，不执行代码。
- 前端发布前执行 `npm.cmd run typecheck` 与 `npm.cmd run build`；后端至少执行 `python -m py_compile app/api/namespaces/service_ns.py app/api/namespaces/message_ns.py app/services/service_service.py app/services/service_message_service.py`，然后联调登录、草稿权限、咨询和源码下载。更新后端与前端时，先部署后端，再部署网站。
