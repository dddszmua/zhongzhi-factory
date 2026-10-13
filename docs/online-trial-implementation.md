# 在线试用配置：本次实现与联调

## 已接通的流程

供应商保存生成或上传的 Python 算法后，进入 `/supplier/trial?id=<模型ID>`。页面通过 `GET /api/services/<id>/clinical-artifact/parameters` 静态读取 `main_process` 参数，使用表单配置类型、范围、单位、合成样例和输出类型。`POST /api/services/<id>/clinical-artifact/configure` 携带 `expectedVersion`，后端保存新版本并在受限容器中运行样例。验证通过后，作者可私有试用，并可开启审核通过后的公开试用。

详情页按服务端 `onlineUsage.canRun` 显示试用入口。运行请求必须携带版本、输入和单位；后端再次校验权限、状态、版本、源码哈希和输入。成功响应包含结果、版本、运行编号及耗时。`algorithm_runs` 只保存运行元数据，不保存用户输入或输出。作者在配置页可查看最近 30 条记录。

当前支持单个 Python 源文件、同步 `main_process`、标量命名参数和 JSON 输出。执行器将当前源码与本次输入通过 stdin 交给容器，不挂载上传目录；默认使用无网络、只读文件系统、非 root、256 MB、1 CPU、20 秒超时的容器。运行镜像需要预先存在于 Docker 宿主机。

## 后端上线顺序

1. 备份生产数据库。
2. 对 MySQL 执行 `ioeb_backend/scripts/sql/20261010_algorithm_runs_mysql.sql`。本地 SQLite 测试库会由 `db.create_all()` 创建新表。
3. 在 Docker 宿主机准备 `CLINICAL_RUNNER_IMAGE` 指向的镜像，默认 `python:3.12-slim`，检查后端进程的 Docker 调用权限。无需配置 `CLINICAL_UPLOADS_DOCKER_VOLUME`。
4. 部署本次 `ioeb_backend`，验证作者身份下的参数、配置、运行和记录接口。再部署本次 `zhongzhi-factory`。
5. 用一个标准库算法、一个未配置的手动上传模型、一个非作者账号分别验收成功、失败与权限路径。

本地已通过前端类型检查、构建、现有前端测试、后端语法检查和独立的运行合同测试。本地 Python 环境缺少 `flask_cors`，完整 Flask 集成测试未执行；本机没有 `python:3.12-slim` 镜像，真实 Docker 执行仍须在测试部署验证。

## 后续扩展

当前版本没有实现权重、多文件依赖、GPU、长任务队列、全局并发配额和完整的不可变源码版本资产。使用这些能力的模型应保持待配置状态。后端按用户限制每分钟 30 次及一条运行中任务，但当前数据库计数无法在多进程并发下保证严格配额；上线前需对高并发试用压测，并接入共享的原子配额控制。还需完善 stdout/stderr 的流式大小限制；当前代码只在进程结束后检查捕获输出大小。
