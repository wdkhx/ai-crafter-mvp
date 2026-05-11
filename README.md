# AI CRAFTER 小程序 MVP

这是根据 `产品定义/需求文档/AI CRAFTER 小程序 MVP 需求文档 V1.0.docx` 生成的完整 MVP 单仓库。

## 项目结构

```text
ai-crafter-mvp/
  backend/              Node.js + Express + MongoDB + LangChain 最简论文工作流
  developer-platform/   React + Ant Design 独立开发者平台
  miniprogram/          原生微信小程序 demo
  docker-compose.yml    本地 MongoDB
  .env.example          必要资源配置模板
```

## 必要资源配置

本地跑通 MVP 只需要：

- Node.js 18+
- Docker Desktop，或一个可连接的 MongoDB
- 微信开发者工具

可选资源：

- `OPENAI_API_KEY`：启用真实 LangChain 大模型生成
- `OPENAI_BASE_URL`：接入 OpenAI 兼容的第三方模型服务，例如本地 vLLM、LM Studio、DeepSeek、硅基流动等
- 外部文献检索 API：当前 MVP 使用内置模拟文献检索，后续可替换为 Semantic Scholar、Crossref、arXiv、学校数据库网关等
- 微信小程序 `appid`：当前 `miniprogram/project.config.json` 使用测试号占位

## 一键启动

```bash
cd ai-crafter-mvp
copy .env.example backend\.env
docker compose up -d
npm install
npm run seed
npm run dev
```

启动后：

- 后端 API: `http://localhost:4000`
- 开发者平台: `http://localhost:5173`
- Mongo Express: `http://localhost:8081`

小程序端：

1. 打开微信开发者工具。
2. 导入 `ai-crafter-mvp/miniprogram`。
3. 在 `miniprogram/config.js` 中确认 `API_BASE_URL` 为 `http://localhost:4000`。
4. 开启“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”用于本地调试。

## 主要接口

```http
POST /api/v1/tools/paper-writing
GET /api/v1/tasks/:taskId
GET /api/v1/tasks/:taskId/export.docx
POST /api/v1/tasks/:taskId/cancel
GET /api/v1/history
GET /api/v1/history/:taskId
DELETE /api/v1/history/:taskId
DELETE /api/v1/history

GET /api/v1/platform/workflows
PUT /api/v1/platform/workflows/:workflowId
GET /api/v1/platform/components
POST /api/v1/platform/components
GET /api/v1/platform/intelligence
POST /api/v1/platform/intelligence/refresh
GET /api/v1/platform/metrics
```

所有业务接口默认需要：

```http
Authorization: Bearer dev-token
```

## 论文写作工作流

后端固定执行以下阶段：

1. 主题解析
2. 文献检索
3. 大纲生成
4. 内容写作
5. 引用格式化
6. 最终输出

如果 `USE_REAL_LLM=false`，系统会生成稳定的演示论文结果；如果 `USE_REAL_LLM=true` 且配置了 `OPENAI_API_KEY`，会通过 LangChain 调用大模型。

接入第三方 OpenAI 兼容服务时，在 `backend/.env` 中配置：

```env
USE_REAL_LLM=true
OPENAI_BASE_URL=https://your-provider.example.com/v1
OPENAI_API_KEY=your-provider-api-key
OPENAI_MODEL=your-model-name
```

## 部署说明

后端推荐部署为容器服务：

1. 准备 MongoDB Atlas 或自建 MongoDB。
2. 在服务平台配置 `MONGODB_URI`、`API_DEMO_TOKEN`、`OPENAI_API_KEY`、`USE_REAL_LLM=true`。
3. 进入 `backend` 执行 `npm ci && npm start`。
4. 反向代理到 HTTPS 域名，例如 `https://api.example.com`。
5. 小程序后台配置 request 合法域名为该 HTTPS API 域名。

开发者平台：

```bash
cd developer-platform
npm run build
```

将 `dist/` 部署到静态站点服务，并设置 `VITE_API_BASE_URL` 指向后端地址。

小程序：

1. 替换 `project.config.json` 中的 `appid`。
2. 替换 `config.js` 的正式 API 域名。
3. 微信开发者工具上传代码并提交审核。

## 合规提示

MVP 页面和接口均保留“仅用于辅助写作，禁止学术不端”的提示。生产环境还需要接入内容安全审核、用户协议、隐私政策、数据 7 天清理任务和真实登录态。
