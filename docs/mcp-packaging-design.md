# MCP 微服务想定式封装实施方案

日期：2026-09-29。状态：架构设计与实施路线图。第一版已在本地三个项目实现核心链路；文中“建议新增”的部分接口是后续演进目标，不代表线上已有。

当前代码已实现：按用户持久化的封装草稿、源码静态函数候选、MCP 想定辅助、工具确认、独立 Agent 任务目录、生成包下载、真实 Docker 上传部署、协议与工具清单检查、测试调用、提交待审核状态，以及独立 MCP 市场页面。实际接口集中在 `/api/mcp-packaging/jobs`；浏览器每 3 秒查询运行状态。尚未实现文中设想的持久化事件流、跨进程队列、自动版本切换、公开鉴权网关及完整工具 schema 数据库迁移。发布审核继续由旧平台处理。

## 1. 结论与范围

可行。新网站采用“选择算法/上传代码 → 描述使用想定 → 确认工具 → 生成封装包 → 部署验证 → 发布”的向导，复用 ioeb_backend 的账户、服务资产和部署能力，复用 Micro-Agent 的代码分析及封装能力。

第一版支持 Python 单文件或带 requirements.txt 的 ZIP 项目、用户有权读取源码的自有算法。包含草稿、任务恢复、包下载、平台部署、工具测试和服务发布。缺少模型权重、依赖文件或运行配置时明确提示，不能承诺任意算法一键可部署。暂不支持任意语言、任意外部 URL 导入或自动暴露全部函数。

保留原 `generated_algorithm`，新建关联的 `atomic_mcp`；一个算法可产生多个封装版本。算法更新后需要用户重新生成和验证，不自动替换已发布服务。

## 2. 已核实的基础与缺口

- 旧页面 `ioeb/src/views/vertical/ms/GenericMicroService.vue` 已串联分析、封装、上传部署；但封装请求主要上传 file，页面服务想定并未完整传递。新页面必须把确认后的结构化想定真正传到生成模板。
- `Micro-Agent/api/routes/agent.py` 已有 `/api/agent/code_analysis`、`/api/agent/service_packaging`、`/api/agent/mcp_test`。普通封装共用输出目录，分析结果也使用共享路径，需要改为按任务隔离。现有临床参数不适合作为通用 MCP 想定契约。
- `Micro-Agent/api/services/sse.py` 需加强终态校验，不能因目录存在就返回成功包。封装模板生成文件，不代表 Docker 已成功构建或工具已可调用。
- `Micro-Agent/api/routes/task.py` 已有状态、事件订阅及取消接口，可复用；任务管理器主要保存在进程内，不能直接当作持久化业务记录。还需任务归属校验、重启恢复策略和事件序号测试。
- 后端 `app/services/service_service.py` 的 `upload_and_deploy_service` 确实调用 Docker 部署；通用 `deploy_service` 有模拟状态推进，不能作为本功能真实部署依据。
- 上传部署在缺少 apiList 时会产生默认工具信息；必须用部署后的真实工具发现结果替换。`ServiceApiTool` 当前主要保存名称、描述，需补充 schema 和版本关系。
- 新站 `src/lib/mappers.ts` 对算法类型有筛选，`atomic_mcp` 需要独立类型映射和页面入口。现有普通 HTTP JSON 试用接口不能直接充当 MCP 调用器。
- `Micro-Agent/micro_agent/tool/mcp/connection.py` 已支持 SSE、stdio 和 Streamable HTTP，并执行 initialize/list_tools，可作为确定性验证的基础；现有 `/mcp_test` 自然语言测试仍固定 SSE。

## 3. 前端交互

新增供应商导航“我的 MCP 服务”，算法详情和我的算法卡片增加“封装为 MCP 服务”。建议路由：

- `/supplier/mcp`：我的服务和未完成封装任务，支持继续编辑、查看失败原因。
- `/supplier/mcp/create?sourceServiceId=...`：想定式封装向导。
- `/supplier/mcp/jobs/:jobId`：持久化任务工作区，可刷新恢复。
- `/mcp-services/:serviceId`：服务详情、工具说明、测试入口及接入配置。
- 市场增加“算法模型 / MCP 服务”类型切换，各自使用独立 mapper。

向导沿用算法生成页的布局语言：步骤条、左侧对话辅助、右侧结构化表单、底部明确的下一步按钮。业务状态保存在服务端，浏览器只缓存临时输入。

1. **选择来源**：选择自己的已生成算法，或上传 .py/.zip。展示来源、文件列表、源码版本摘要。平台来源由后端按用户权限读取，不让前端传本地路径。检查入口、依赖、模型权重等缺失项。
2. **描述想定**：填写服务名称、面向用户、使用场景、希望暴露的能力、输入输出示例、限制条件。支持自然语言补全表单；缺失信息追问，展示字段变化并允许修改。部署选项使用平台支持的资源规格 ID；凭据通过独立配置绑定，禁止写入对话或代码包。
3. **确认工具**：分析后展示候选函数、建议工具名、说明、参数 schema、输出说明和副作用提示。用户选择需要暴露的能力；每项必须关联真实函数及源码摘要。分析无法确定的输入输出需补充确认。更改源码后使旧分析失效。
4. **生成封装**：展示已确认想定及工具列表，点击生成后显示真实阶段、日志摘要及耗时，不伪造百分比。可取消、离开后继续查看。完成后提供目录预览、README、工具清单、验证报告和 ZIP 下载。
5. **部署与测试**：选择平台部署或仅下载。平台部署显示构建、启动、协议连接、工具发现各阶段。依据实际 inputSchema 生成表单，同时提供 JSON 编辑器；复杂 schema 使用 JSON 校验回退。展示工具返回内容、耗时、错误和测试记录；有副作用的调用先明确确认。
6. **发布**：验证通过后显示服务简介、版本、访问范围、工具清单和接入配置，用户明确提交发布。发布失败、审核中、已发布分别展示，不把容器启动等同于市场上架。

部署失败保留代码包；生成失败保留想定和已完成分析；重试只重做失败阶段。新版本在独立实例验证，通过后再切换，原版本保持可用。

## 4. 调用架构

浏览器 → ioeb_backend（登录、权限、业务记录、任务门面）→ Micro-Agent（分析、生成、MCP 验证适配器）。部署工作进程复用后端现有部署基础能力，运行在受限的构建/运行环境。

新功能通过后端统一鉴权，使用现有 `Access-Token`。浏览器不直接调用无归属约束的 Agent 通用任务接口；内部调用使用服务身份，任务 ID 必须映射到当前用户业务任务。Micro-Agent 不新增另一套用户系统。

进度流与 MCP 传输是两件事：前者给浏览器展示任务进度，后者用于连接生成的服务。采用后端事件流和状态查询，不用浏览器长连接存活来决定任务是否继续。

### 已有接口的复用方式

以下是浏览器或服务端完整路径；前端 apiClient 默认已有 `/api` 前缀。

- `GET /api/services/mine`：选择自己的算法，在类型筛选后展示；以实际分页契约为准。
- `GET /api/services/{id}/scenario-generated-code`：读取有权访问的算法源码，后端封装流程优先调用相同业务函数。
- `POST /api/agent/code_analysis`、`POST /api/agent/service_packaging`：内部复用分析及生成逻辑，增加任务隔离与结构化输入。
- `GET /api/tasks/{id}/status`、`GET /api/tasks/{id}/stream`、`POST /api/tasks/{id}/cancel`：内部复用 Agent 任务能力，补齐归属和持久化桥接。
- `POST /api/services/upload`：保留旧调用兼容性；新流程抽取并复用其实际部署业务函数，关联指定版本，避免每次重试重复创建服务。
- `GET /api/services/{id}`：复用基础服务详情；MCP 扩展详情由新增接口提供。
- `POST /api/agent/mcp_test`：可保留为后续自然语言体验入口，不作为发布门禁的唯一依据。

### 建议新增的浏览器接口

以 `/api/mcp-packaging` 为任务命名空间：

- `POST /jobs`：创建草稿，来源为 `{kind: "platform_algorithm", service_id: "..."}` 或 `{kind: "upload"}`；返回 job_id、revision。
- `GET /jobs`、`GET /jobs/{id}`：本人任务列表、完整快照，含阶段、缺失项、产物、关联 service_id。
- `PUT /jobs/{id}/source`：multipart 上传源文件；替换来源会使分析及封装产物失效，运行中禁止替换。
- `PATCH /jobs/{id}`：保存想定及工具选择，携带 revision，冲突返回 409。
- `POST /jobs/{id}/intake`：`{message, revision}`；返回建议字段、追问、changed_fields。只补全想定，不隐式开始部署。
- `POST /jobs/{id}/runs`：`{stage: "analyze" | "package", revision}`，返回 202 和 run_id；前置条件不满足返回结构化 missing_fields。
- `GET /jobs/{id}/events`：SSE，支持 Last-Event-ID；事件包含 seq、run_id、stage、status、message、occurred_at。断线后用快照校准并续读。
- `POST /jobs/{id}/runs/{runId}/cancel`：返回 cancelling，工作进程确认停止后才记 cancelled。
- `GET /jobs/{id}/artifacts/{artifactId}`：鉴权下载或短时签名链接，提供 hash、size、filename；不把大 ZIP base64 存入浏览器状态。
- `POST /jobs/{id}/deployments`：`{artifact_id, runtime_profile_id}`，返回 202、deployment_id、service_id；支持 Idempotency-Key。

以 `/api/mcp-services` 为运行服务命名空间：

- `GET /{serviceId}`：版本、部署状态、工具 schema、接入信息和最新测试报告。
- `POST /{serviceId}/checks`：对指定 deployment_id 做 initialize、分页 tools/list、能力对照检查，返回异步检查任务；结果并入详情快照和任务事件。
- `POST /{serviceId}/tool-calls`：`{deployment_id, tool_name, arguments, confirmation?}`。后端按注册实例连接，禁止传任意 server_url。返回 call_id、content、structured_content（若有）、is_error、duration_ms。
- `POST /{serviceId}/publish`：指定通过验证的版本及访问范围，走既有发布/审核规则；不能绕过审核。
- `POST /{serviceId}/stop`：所有者操作，执行真实停止并更新运行状态；下架和停止分开处理。

列表可扩展已有服务查询支持 `type=atomic_mcp`，不必重复建设一套市场分页接口。下载、测试、发布、停止均需分别校验权限；公开详情不等于公开源码或允许匿名调用。

## 5. 想定契约与生成结果

新增通用 `packaging_spec`，而不是把配置塞进 clinical_scope。例：

```json
{
  "schema_version": 1,
  "service_name": "异常交易评分服务",
  "scenario": "智能助手调用已有模型，对输入交易进行异常评分",
  "target_users": ["业务分析人员"],
  "source_digest": "sha256:...",
  "analysis_artifact_id": "artifact-analysis-001",
  "tools": [{
    "entrypoint": "model:score_transactions",
    "name": "score_transactions",
    "description": "对交易列表进行异常评分",
    "input_schema": {
      "type": "object",
      "properties": {"transactions": {"type": "array", "items": {"type": "object"}}},
      "required": ["transactions"],
      "additionalProperties": false
    },
    "side_effects": "none",
    "example_arguments": {"transactions": [{"amount": 100}]}
  }],
  "transport": "sse",
  "runtime_profile_id": "cpu-small",
  "constraints": {"external_network": false}
}
```

例子中的函数和 schema 必须来自具体代码分析与用户确认，不作为任意算法的默认能力。第一版优先透明包装已存在的函数，适配层变更需可审查，不默默改写原算法。

Agent 新增专用 MCP intake 逻辑，可复用算法 intake 的对话填表框架，但使用独立字段定义、校验和提示词。分析/封装核心接收 job_id、run_id、受控源文件路径、结构化 spec 和分析产物引用；不信任用户提供任意文件系统路径。

每个运行独立目录：`workspace/mcp-jobs/{job_id}/{run_id}/`，其中 source、analysis、output、logs 分开。生成器输出 source、server.py、锁定的依赖、Dockerfile、受控 compose 模板、README、mcp-manifest.json、测试样例和报告。manifest 记录源摘要、工具定义、传输类型、协议/SDK 版本及运行要求。

完成标准是 Agent 成功终止、要求文件齐全、静态校验通过且产物已持久化。错误事件后不能再给成功包；清理必须等工作进程终止且产物存储完成。

## 6. 数据及状态

建议增加 `mcp_packaging_jobs`、`mcp_packaging_runs`、`mcp_artifacts`、`mcp_deployments`、`mcp_check_results`，以及可重放的运行事件记录。复用现有 Service 表和工具表，工具增加 input_schema、output_schema（可空）、annotations（可空）、version/deployment 关联。数据库变更使用迁移脚本。

- job：owner_id、source_service_id、source_digest、spec_json、revision、service_id、最新产物和运行关联。
- run：阶段、状态、agent_task_id、heartbeat、错误代码、事件序号。终态不可被迟到事件覆盖。
- artifact：类型、存储位置、digest、大小、所属 run；源代码及产物默认私有。
- deployment：service_id、artifact_id、实际 transport、协议/SDK 版本、内部地址、外部路由、运行规格、状态。
- check：绑定 deployment 和 artifact 摘要，记录真实发现的工具、schema 差异、测试结果与时间。

不要把业务状态编码进服务简介，也不要将数 MB 的 base64 存入 Service 字段。

三个维度分别记录：

- 封装：draft → analyzing → needs_confirmation → packaging → packaged；运行阶段可 failed/cancelling/cancelled。
- 部署：queued → building → starting → checking → ready；可 failed/stopped。
- 发布：private → pending_review（若需要）→ published → unpublished。

后端先写入运行记录，再由独立工作进程领取任务；第一版可用数据库持久化队列和租约，不强制引入另一套分布式平台。网页请求线程不承担整个构建。工作进程重启后检查租约和实际容器状态：不能恢复的 Agent 运行标记 interrupted，可手动重试，不虚假宣称自动续算。

## 7. 协议、部署和调用正确性

当前封装模板、默认部署 URL 和旧测试使用 legacy SSE；连接管理器已经支持 Streamable HTTP。第一版可先端到端兼容 SSE，但必须存储 transport，锁定测试过的 SDK 版本，并让校验/调用按 transport 分派。新模板切换 Streamable HTTP 前，需要联测 SDK、网关方法/请求头、路由和客户端配置，不能只把 `/sse` 改名为 `/mcp`。

Streamable HTTP 已在官方 2025-03-26 规范中替代旧 HTTP+SSE。该结论用于兼容性设计，不意味着这里引用的是最新协议版本；上线时选择明确受支持的版本组合。参考：[传输规范](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)。

部署验证按顺序执行：构建成功 → 容器存活 → initialize → 完整 tools/list → 与批准的工具和 schema 对照 → 用户选定的安全样例 tools/call。需要副作用操作的测试必须单独确认。只有通过当前版本验证，才具备发布条件。测试通过表示当前样例可用，不代表算法所有输入都正确。参考：[工具规范](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)。

优先复用现有 MCPConnectionManager，增加确定性的 discover/call 适配接口；不让 LLM 决定一次测试究竟调用哪个工具。处理工具错误 isError、协议错误、超时及分页；不把 HTTP 200 等同于业务调用成功。

部署复用现有 ZIP 处理、端口分配、Docker 调用，但上线前增加：安全解压、依赖和构建限制、受控 Docker 配置、资源限额、禁用特权容器和宿主敏感挂载。平台凭据独立注入并脱敏，禁止进入生成包。调用器只访问后端注册的实例，防止任意 URL 探测内部网络。

外部接入建议提供按 service_id/version 的稳定网关地址及可撤销凭据，内部端口不是用户契约。SSE 的消息路径也必须正确转发。若第一版未完成外部鉴权网关，则仅开放登录后的站内测试，不把裸容器地址作为正式公开接入能力。

生成进度流采用带 Access-Token 的 fetch SSE（原生 EventSource 不便附加该头）；配置代理关闭缓冲、心跳及合理超时。统一上传大小限制。现有 agentStream 的完成/警告处理不要直接照搬：断流不算成功，warning 可继续，成功必须收到明确终态并核对服务端快照。

## 8. 代码落点和实施顺序

前端新增 `src/api/mcpPackaging.ts`、`src/types/mcp.ts`、`src/pages/supplier/mcp/` 和 `src/components/mcp/`；调整路由、供应商导航、算法详情入口、市场分类及 mapper。复用 CreatePage 的交互组件，不直接复制整页业务。

ioeb_backend 增加 MCP 任务/服务 namespace、业务服务、模型迁移、后台运行器；抽取现有真实部署函数，使其支持幂等、已有服务的版本部署和状态回写。Micro-Agent 增加 MCP 想定采集和结构化 spec，修正任务目录隔离、产物终态判断，提供确定性的协议检查及工具调用。旧入口参数保持兼容，旧任务与新任务都要避免共享产物。

按可验收的阶段推进：

1. 固定来源、spec、任务和 manifest 契约；完成持久化、权限、隔离及 Agent 改造。
2. 完成新站向导，实现“自有算法/上传 → 确认工具 → 生成 → 下载”，验证想定确实影响输出。
3. 完成真实部署、工具发现、参数化测试、取消/重试及异常恢复。
4. 接入既有发布规则、服务市场、详情和鉴权接入配置；补充操作与部署文档。

部署顺序：数据库迁移和兼容后端 → Agent/运行器 → 新站入口。功能开关控制入口；关闭入口不影响原算法功能。生产部署需要迁移备份、工作进程配置、受控存储目录、内部服务凭据及反向代理配置。

验收至少覆盖：两用户并发没有文件混用；他人任务/源码不能访问；刷新与断线可恢复展示；进程重启明确显示中断；取消真实停止；重复部署请求只创建一次实例；工具 schema 与真实服务一致；缺依赖或协议握手失败不能发布；重试不重复新增服务；原算法不被覆盖；旧封装入口兼容；外部无权限请求不能调用私有服务。

本次仅依据本地代码与官方协议资料制定方案，未执行生产接口、真实生成或部署，因此不将已有链路视为已完成生产联调。
