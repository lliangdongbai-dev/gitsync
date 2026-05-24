# GitSync

Git 仓库定时同步工具 — 将源仓库的分支和标签 1:1 镜像同步到目标仓库。

## ✨ 功能特性

- 🔄 **定时自动同步** — 分钟级频率，修改后立即生效无需重启
- 🌿 **灵活分支选择** — 全量镜像 / 仅分支 / 仅标签 / 自定义多选（支持从远程仓库加载列表）
- 🔐 **双重认证** — HTTPS Token（AES-256 加密存储）和 SSH Key（source/target 独立认证）
- 📊 **仪表盘** — 任务总览、成功率、最近同步记录
- 📋 **详细日志** — 每个分支的 commit 数、标签状态，点击展开查看
- ⏱ **实时状态** — SSE 推送，任务状态变化实时更新，无需刷新页面
- 🔔 **多渠道通知** — 钉钉 / 飞书 / 邮件(SMTP) / 通用 Webhook，支持成功/失败策略
- 🌙 **亮/暗主题** — localStorage 持久化
- 📱 **响应式布局** — 侧边栏可收起，移动端友好

## 🚀 快速开始

### Docker Compose（推荐，单机一键部署）

```bash
git clone <your-repo-url> gitsync
cd gitsync
cp .env.example .env
# 编辑 .env 设置认证和加密密钥（可选）
docker compose up -d --build
```

访问 `http://localhost:3001` 即可使用。前端页面和 API 都在同一个端口。

### Node.js 直接部署

```bash
# 构建前端（生成 client/dist/）
cd client && npm ci && npm run build && cd ..

# 构建后端（生成 server/dist/）
cd server && npm ci && npm run build

# 配置环境变量
cp .env.example server/.env

# 启动（前端静态文件由后端 Express 托管）
node server/dist/index.js
```

### 开发模式

```bash
# 终端1：启动后端
cd server && npm run dev

# 终端2：启动前端（Vite 热更新，代理 /api 到 3001）
cd client && npm run dev
```

## 📁 项目结构

```
gitsync/
├── client/              # 前端 (React + MUI + Vite)
│   └── src/
│       ├── pages/       # 仪表盘、任务列表、任务表单、日志、设置
│       ├── components/  # Layout、Sidebar、TaskCard、SyncLogTable 等
│       ├── hooks/       # useTasks、useSyncLogs、useSettings、useTaskEvents
│       ├── api/         # axios 封装，所有 API 调用
│       └── types/       # TypeScript 类型定义
├── server/              # 后端 (Express + SQLite + simple-git)
│   └── src/
│       ├── routes/      # tasks、sync、syncLogs、settings
│       ├── models/      # task、syncLog、setting
│       ├── services/    # gitSync、scheduler、notifier、eventBus
│       ├── middleware/  # auth（Basic Auth）、errorHandler
│       ├── utils/       # time（本地时间格式化）
│       └── types/       # TypeScript 类型定义
├── docs/
│   ├── architecture.md          # 架构设计文档
│   ├── tasks.md                 # 开发任务记录
│   ├── user-guide.html          # 使用手册
│   ├── deploy-guide.html        # 部署手册
│   └── sequence-*.mermaid       # 时序图
├── docker-compose.yml
├── Dockerfile                   # 多阶段构建
├── ecosystem.config.js          # PM2 配置
└── .env.example                 # 环境变量模板
```

## ⚙️ 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口（前端+API 共用） |
| `AUTH_USER` | 空 | Basic Auth 用户名（也可在页面设置） |
| `AUTH_PASS` | 空 | Basic Auth 密码（也可在页面设置） |
| `ENCRYPTION_KEY` | 空 | Token 加密密钥（32位，留空明文存储） |
| `LOG_RETENTION_DAYS` | `7` | 日志保留天数 |
| `DB_PATH` | `data/gitsync.db` | SQLite 数据库路径 |
| `REPO_DIR` | `data/repos` | bare repo 缓存目录 |
| `SSH_KEY_DIR` | `data/ssh_keys` | SSH 私钥存放目录 |

## 🔧 技术栈

**前端：** React 18 · TypeScript · MUI 5 · Vite 5 · React Router 6 · Axios

**后端：** Node.js 20 · TypeScript · Express 4 · SQLite (better-sqlite3) · simple-git · node-cron · nodemailer

## 📖 文档

- [使用手册](docs/user-guide.html) — 功能说明、操作指南、常见问题
- [部署手册](docs/deploy-guide.html) — Docker/Node.js 部署、反向代理、安全配置
- [架构文档](docs/architecture.md) — 技术栈、数据结构、API 接口、核心服务设计

## 🛡 生产环境安全建议

1. 设置 `AUTH_USER` + `AUTH_PASS` 启用访问认证
2. 设置 `ENCRYPTION_KEY` 加密存储的 Token
3. 使用反向代理（Nginx/Caddy）+ HTTPS
4. 防火墙只开放 80/443，不直接暴露 3001 端口

## 📄 License

MIT
