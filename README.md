# 临床医疗算法模型众智工场

## 提交新模型（简化流程）

`/supplier/create` 先让用户选择“自然语言对话创建”或“论文复现”。生成前只需填写模型名称和需求描述；论文模式还需上传 PDF/DOCX 并核对提取内容。每个任务有独立的 `/supplier/create/task/<id>` 地址，刷新后从后端读取对话、论文、生成进度和结果。“最近任务”可找回已离开的任务。已有代码上传和旧草稿继续走 `/supplier/create/legacy`。

本地联调需要同时启动 `ioeb_backend`、`Micro-Agent` 和前端。后端设置 `DATABASE_URL` 指向本地数据库；Agent 地址通过 `CLINICAL_AGENT_BASE_URL` 指定，未设置时使用 `MCP_AGENT_BASE_URL`，再未设置时为 `http://127.0.0.1:8010`。后端运行在 Docker 容器内时，地址须改为容器能访问的 Agent 地址。前端开发代理继续使用 `.env.development` 中的 `VITE_DEV_API_PROXY` 和 `VITE_DEV_AGENT_PROXY`。

任务数据保存在 `clinical_creation_jobs` 表，论文文件保存在后端 `UPLOAD_FOLDER/clinical-creation` 下；生产部署需持久化该目录，并应用 `ioeb_backend/scripts/sql/20261013_clinical_creation_jobs_mysql.sql`。生成由后端进程中的工作线程执行，浏览器刷新不会中断；若后端进程重启，运行中的任务会在约 30 秒后标记为“任务中断”，用户可在任务页重新生成。

本站面向临床医生与医学研究团队，提供临床算法目录、结构化需求描述、模型说明卡、浏览器本地的二分类验证，以及模型提交与 MCP 服务封装。公开目录仅展示具有临床说明卡且审核状态为批准的服务；历史服务默认待归类。详细实现和后端上线约束见[临床专站说明](docs/clinical-site.md)。

这是一个独立的 React 单页应用，通过 HTTP 调用 `ioeb_backend` 的 `/api` 接口及可选的 `Micro-Agent` 智能体接口。仓库仅包含前端；后端及智能体需分别部署。默认开发代理和容器 Nginx 代理均指向 `https://fdueblab.cn`。**当前临床目录筛选只在前端执行，正式上线必须由后端实现目录审核与访问控制。**

MCP 封装需要本仓库、配套 `ioeb_backend` 的 MCP 任务接口，以及 `Micro-Agent` 的结构化想定与内部验证接口同步部署。详细设计见 [MCP 封装方案](docs/mcp-packaging-design.md)。当前入口在供应商中心「我的 MCP 服务」及自有算法卡片「封装为 MCP 服务」；流程为选择源码、想定辅助、确认工具、生成下载、真实部署、协议及工具验证、提交平台审核。市场仅列出状态为 `released` 的 MCP 服务。

后端需配置 `MCP_AGENT_BASE_URL`，指向后端容器可访问的 Agent 地址；后端与 Agent 需设置相同的 `MCP_INTERNAL_TOKEN`。`SERVICE_HOST_URL` 须与部署产生的 MCP 网关地址一致，并确保 Agent 能访问该地址。`MCP_PACKAGING_BASE_PATH` 可指定持久化存储目录，默认在后端 `UPLOAD_FOLDER/mcp-packaging` 下。新表由当前后端启动的 `db.create_all()` 创建；生产部署前备份数据库并确认新表创建成功。Agent 仍须具备其原有 MCP 依赖与 Docker 封装知识库。

当前实现的封装任务使用数据库保存状态，工作线程在后端进程内执行。页面断线可重新查询状态；进程中断后，长时间无进度的任务会标记为中断，可重新生成。容器部署使用后端原有的 Docker 上传链路，服务只在通过真实 MCP 工具校验后允许提交待审核状态。平台对外 MCP 凭据和服务版本切换尚未纳入本次实现，公开接入应由平台网关配置。

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

## 体验论文 / 专利复现与在线试用

此功能需要同时运行本仓库、`ioeb_backend` 和 `Micro-Agent` 的本次代码。浏览器开发代理分别指向后端 `5000` 端口和 Agent `8010` 端口。后端需能调用 Docker；先在 Docker 宿主机执行 `docker pull python:3.12-slim`。在线试用执行器只向受限容器传入当前模型的源码和本次输入，不挂载上传目录，因此无需配置 `CLINICAL_UPLOADS_DOCKER_VOLUME`。

1. 登录后打开 `/supplier/create`，填写临床说明卡。在「生成依据与目标」选择「依据论文或专利复现」，上传 PDF/DOCX 主资料，检查提取预览，填写关键页码、公式及参数，然后生成、审阅代码并提交。
2. 打开 `/supplier/trial?id=<提交后显示的模型 ID>`。若运行规范待配置，填写与 `main_process` 一致的规范及合成输入并保存。样例运行通过后可直接在同页的试用表单输入数据并查看真实输出。
3. 复现模式还要在「原文结果对照」填写原文中的独立示例输入、预期输出及页码。只有对照通过的当前版本才可获目录批准。
4. 有后端管理员权限的用户打开 `/supplier/review` 下载并检查参考资料、审核模型。审核通过且作者开启公开试用后，其他登录用户在 `/market` 进入详情页即可试用。付费模型还需完成购买。

扫描件 OCR、训练权重和 GPU 推理尚不在当前轻量执行器范围内。详见 [论文 / 专利复现与在线试用设计](docs/paper-reproduction-and-online-trial.md)。

## 构建与验证

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run test
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

### 科室模型与论文示例（2026-11-17）

- 主入口为首页、科室模型、创建模型、我的模型。用户页面不再提供 MCP 入口；旧链接显示入口已停用，底层执行接口保持兼容。
- 科室目录使用 `src/lib/departments.ts` 中的稳定 ID。模型的 `ZZF_CLINICAL_V1` 说明卡新增 `departmentIds`；历史模型仍按专科说明匹配，可从编辑页重新归类。仅修改创建任务所属科室不会使已生成算法失效。
- 创建时先选择科室，再使用示例论文、上传论文或描述需求。所属科室持久保存在创建任务 `intake.catalog.departmentId` 中，并在保存模型时写入说明卡。
- 论文目录由后端 `app/resources/clinical_catalog/catalog.json` 管理，覆盖 13 个科室，共 11 篇去重文献。其中 10 篇保存本地 PDF 和可编辑的预设要求；ADNEX 的公开下载源暂不可用，按钮禁用并提示文件未就绪。点击「使用此论文复现」直接创建已附论文的任务，无需手动下载上传，也不依赖期刊网站实时可用。`canCreate` 表示本地材料可用，与算法验收状态 `readiness` 分开。新增文件保留原始 PDF，并记录下载来源、SHA-256 和使用条件；PRIEST 和 ABC₂-SPH 继续保留已核对的补充转录。
- `GET /api/clinical-creation/catalog` 提供目录；创建任务支持 `departmentId`、`paperId`、`paperVersion`。自动带入仅接受目录内已备齐材料、匹配科室与版本的论文，并检查 PDF 摘要。替换论文会清除旧示例规则与恢复记录。
- 示例材料完整不等于新生成版本已通过计算或临床验证。当前运行、生成和验证机制保持不变。
- 本次回归：`npm run typecheck`、`npm run build`、`node --test tests/departments.test.mjs tests/clinicalResult.test.mjs`；后端运行 `python -m pytest tests/integration/test_clinical_creation.py tests/unit/test_reproduction_evidence.py -q`。

- 买家：引导式需求填写和市场检索、收藏列表、商品咨询、消息中心、已配置服务的在线试用。商品详情支持导入最多 20 条 JSON 用例进行浏览器端批量测评，按预期 JSON 比较输出；测评结果不会保存到服务器。
- 供应商：服务端草稿、续编和发布，已登记商品编辑，消息回复，生成源码查看与下载。手动上传可提交主 Python 源码、可选测试脚本及数据集，交由后端保存。
- `ioeb_backend` 需要提供 `/api/services/mine`、`/api/services/<id>`、`/api/services/scenario-generated/upload`（支持 `draft_id`）、`/api/services/<id>/scenario-generated-code`、收藏关系接口及 `/api/messages/user` 等接口。源码下载只允许成果创建者，草稿仅创建者可见。
- 保存草稿时，表单内容暂存于服务的 `source.companyIntroduce` 字段，使用 `ZZF_DRAFT_V1:` 前缀；文件和生成结果不随草稿保存，续编后需重新选择或生成。部署前应验证数据库字段容量能够容纳实际表单内容。
- AI 生成或上传源码登记成功后，成果初始状态是 `not_deployed`。在线试用还需要供应商配置可访问的运行端点并部署服务。源码页仅显示已保存的 Python 源码，不执行代码。
- 前端发布前执行 `npm.cmd run typecheck` 与 `npm.cmd run build`；后端至少执行 `python -m py_compile app/api/namespaces/service_ns.py app/api/namespaces/message_ns.py app/services/service_service.py app/services/service_message_service.py`，然后联调登录、草稿权限、咨询和源码下载。更新后端与前端时，先部署后端，再部署网站。
