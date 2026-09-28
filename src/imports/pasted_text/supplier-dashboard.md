Design a modern Chinese SaaS web interface for “众智工场” supplier center.

Context:
众智工场 is an AI algorithm marketplace and algorithm delivery platform. The buyer-facing homepage is for non-technical business users to find, try, customize, and purchase AI algorithm models. This design is for the supplier-side backend, where algorithm providers publish algorithm models as tradable algorithm products.

Important positioning:
The current old pages are too technical and look like an internal admin system. Redesign them as a supplier center and algorithm product publishing workflow.
The old functions include:
1. AI resource search
2. Algorithm model scenario-based development
3. Atomic microservice publishing

In the new design, these should become:
1. 我的算法商品 / Algorithm product management
2. 创建算法商品 / Create algorithm product
3. 配置在线试用与交付方式 / Configure trial, delivery, and transaction

Do not expose technical terms such as 原子微服务, 元应用, 参数化构建, MCP服务, 置信度列表 as main user-facing labels. Technical settings can be placed under “高级设置”.

Canvas:
Desktop web app, 1440px wide.
Clean enterprise SaaS style.
Light background, white cards, rounded corners, subtle shadows.
Primary color: #1E5EFF.
Accent colors: #7B61FF, #22A06B, #F59E0B.
Use modern Chinese typography.
The page should feel like a professional supplier dashboard for an AI algorithm marketplace, similar to Shopify seller center + AWS Marketplace seller portal + Hugging Face model card management.

Create 4 screens:

Screen 1: 供应商中心首页 / Supplier Dashboard

Layout:
Left sidebar navigation with logo:
众智工场
AI算法模型交易与交付平台

Sidebar items:
- 工作台
- 我的算法商品
- 发布新算法
- 在线试用配置
- 评测认证
- 订单与交易
- 案例与模板
- 数据统计
- 账号设置

Top bar:
- 当前空间：跨境支付AI监测
- 通知 icon
- 用户头像：超级管理员

Main content:
Header:
“供应商中心”
Subtitle:
“管理你的算法商品、在线试用、交易订单与平台认证。”

Top KPI cards:
1. 已发布算法：12
2. 待认证算法：3
3. 本月试用次数：2,330
4. 本月交易额：¥36,800

Main action cards:
Card 1:
Title: 发布新算法
Description: 将你的算法模型包装成可试用、可交易的算法商品。
Button: 开始发布

Card 2:
Title: 配置在线试用
Description: 上传示例数据，让买家可以立即体验算法效果。
Button: 配置试用

Card 3:
Title: 提交平台认证
Description: 通过可运行性、文档完整性和效果评测审核。
Button: 申请认证

Card 4:
Title: 查看订单
Description: 管理购买、订阅、定制开发和企业授权订单。
Button: 查看订单

Below:
Recent algorithm products table:
Columns:
- 算法商品
- 输入类型
- 输出结果
- 状态
- 试用次数
- 认证状态
- 交易方式
- 操作

Example rows:
1. 跨境支付异常交易识别模型
Input: Excel / CSV
Output: 风险交易清单
Status: 已上架
Trial: 2330
Certification: 官方认证
Transaction: 按次调用 / 企业授权
Actions: 编辑, 查看详情

2. 样例报告生成模型
Input: Word / PDF
Output: 分析报告
Status: 待认证
Trial: 386
Certification: 未认证
Transaction: 免费试用
Actions: 编辑, 提交认证

Screen 2: 我的算法商品 / Algorithm Product Management

Purpose:
This page replaces the old “垂域应用AI资源检索” backend table.

Page title:
“我的算法商品”

Subtitle:
“管理已创建、已上架、待认证和待配置的算法商品。”

Top search area:
Large search input:
“搜索算法名称、业务问题、输入类型或行业场景”

Filter chips:
- 全部
- 已上架
- 草稿
- 待认证
- 可试用
- 可交易
- 支持定制

Advanced filters:
- 输入类型：Excel / PDF / Word / 图片 / 视频 / 数据库
- 输出结果：报告 / 风险清单 / 分类结果 / 预测结果 / 图表 / Demo
- 行业场景：金融风控 / 工业质检 / 电商运营 / 文档审核 / 高校科研
- 交易方式：免费试用 / 按次调用 / 月订阅 / 企业授权 / 定制报价

Main area:
Use a hybrid layout:
Top: algorithm product cards
Bottom: compact management table

Product card design:
Each card should include:
- Algorithm product name
- Business-friendly description
- Input type
- Output type
- Status badges
- Trial count
- Certification status
- Buttons

Example card:
Title: 跨境支付异常交易识别模型
Description: 根据交易记录识别异常支付、风险交易和可疑行为。
Input: Excel / CSV
Output: 风险交易清单 + 审核建议
Tags: 金融风控, 异常识别, 可试用
Badges: 已上架, 官方认证
Buttons: 查看商品页, 编辑, 配置试用

Another card:
Title: 样例报告生成模型
Description: 上传业务材料后，自动生成结构化分析报告。
Input: Word / PDF
Output: Word报告
Tags: 报告生成, 文档处理
Badges: 草稿, 待认证
Buttons: 继续配置, 提交认证

Right side panel:
“商品完整度”
Show checklist:
- 基础信息已填写
- 输入输出已配置
- 示例数据已上传
- 在线试用已开启
- 价格规则已设置
- 评测报告已生成
- 平台认证已通过

Screen 3: 发布新算法 - 创建算法商品 / Create Algorithm Product Wizard

Purpose:
This page replaces the old “算法模型想定式开发”.

Design this as a multi-step wizard, not a dense technical form.

Top stepper:
1. 填写业务信息
2. 配置输入输出
3. 上传模型或连接服务
4. 配置在线试用
5. 设置价格与交易
6. 提交评测认证

Current step: 1. 填写业务信息

Page title:
“创建算法商品”

Subtitle:
“请用业务语言说明这个算法能解决什么问题。平台会根据你的描述生成商品页、试用配置和评测要求。”

Main form sections:

Section 1: 基础信息
Fields:
- 算法商品名称
Placeholder: 例如：跨境支付异常交易识别模型

- 一句话说明
Placeholder: 例如：根据交易记录识别异常支付、风险交易和可疑行为。

- 适用行业
Dropdown:
金融风控 / 工业质检 / 电商运营 / 文档审核 / 高校科研 / 医疗科研 / 其他

- 适用场景
Dropdown:
反洗钱 / 客户流失预测 / 产品缺陷识别 / 合同审核 / 问卷分析 / 数据报告 / 其他

Section 2: 业务问题描述
Large text area:
Label:
“这个算法解决什么业务问题？”
Placeholder:
“请描述业务人员能理解的问题，例如：企业每天有大量跨境支付交易，需要自动识别可疑交易并输出风险等级，帮助风控人员优先审核。”

Section 3: 输入与输出
Two-column cards.

Left card:
Title: 用户需要准备什么？
Checkboxes:
- Excel / CSV 数据表
- Word / PDF 文档
- 图片
- 视频
- 音频
- 数据库
- 其他

Right card:
Title: 用户会得到什么结果？
Checkboxes:
- 风险清单
- 分类结果
- 预测结果
- 图表
- Word/PPT 报告
- 可视化 Demo
- 可接入企业系统的服务
- 其他

Section 4: 适用与不适用
Two text areas:
- 适用场景
- 不适用场景

Example helper text:
“请明确说明算法边界，避免买家误用。”

Right preview panel:
Show a live preview of how this algorithm will appear in the buyer-facing AI algorithm marketplace.

Preview card:
Title: 跨境支付异常交易识别模型
Description: 根据交易记录识别异常支付、风险交易和可疑行为。
Input: Excel / CSV
Output: 风险交易清单 + 审核建议
Badges: 可试用, 支持定制
Buttons: 试一下, 查看详情

Bottom buttons:
- 保存草稿
- 下一步：配置输入输出

Screen 4: 配置在线试用与交付方式 / Configure Trial and Delivery

Purpose:
This page replaces the old “垂域原子微服务发布”.
Do not call it microservice publishing. Present it as configuring how buyers can try and use the algorithm.

Top stepper:
1. 填写业务信息
2. 配置输入输出
3. 上传模型或连接服务
4. 配置在线试用
5. 设置价格与交易
6. 提交评测认证

Current step: 4. 配置在线试用

Page title:
“配置在线试用与交付方式”

Subtitle:
“让买家在购买前可以上传样例数据试用算法，并明确购买后如何交付。”

Main content:

Section 1: 算法来源
Three selectable cards:
1. 使用平台已生成模型
Description: 从已创建的算法模型中选择。
2. 上传已有算法文件
Description: 上传代码包、模型文件或容器文件。
3. 连接外部服务
Description: 连接已有企业服务或第三方接口。

Selected card should have blue border.

Section 2: 在线试用设置
Toggle:
“允许买家在线试用”

If enabled, show:
- 试用输入文件类型
Checkboxes: Excel / CSV / Word / PDF / 图片 / 视频
- 最大文件大小
Dropdown: 10MB / 50MB / 100MB
- 免费试用次数
Input: 3次 / 10次 / 自定义
- 是否使用示例数据
Toggle: 提供平台示例数据

Upload area:
“上传示例数据”
Drag and drop area:
支持 Excel / CSV / Word / PDF / 图片
Button: 上传示例数据

Section 3: 运行结果展示
Select output display types:
- 表格结果
- 图表结果
- 风险清单
- 分类结果
- 报告下载
- Demo 页面预览

Section 4: 交付方式
Checkbox cards:
1. 在线使用
“买家在平台内直接运行。”
2. 下载结果
“买家可下载报告、表格或图表。”
3. 企业系统接入
“支持后续接入企业系统。”
4. 定制开发
“支持按买家数据和业务流程定制。”

Section 5: 高级设置
Collapsed accordion.
Label:
“高级设置：运行环境、服务地址、接口文档、部署规格”
Inside advanced settings, include technical fields:
- 服务地址
- 运行环境
- 容器规格
- 超时时间
- 日调用限制
- 日志开关
But keep this collapsed by default.

Right side preview panel:
Title:
“买家试用页面预览”

Show mock buyer view:
- Upload sample file button
- Run trial button
- Example output area
- Download report button

Bottom buttons:
- 上一步
- 保存草稿
- 下一步：设置价格与交易

Additional design instruction:
Make the supplier workflow clear, step-by-step, and less technical.
The old system had too many scattered backend modules. The new design should show that algorithm product publishing is one continuous workflow:
Create product → configure input/output → connect model/service → enable trial → set pricing → submit certification → publish to marketplace.

Use clear Chinese labels and avoid dense tables where possible.