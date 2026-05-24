# GitSync 架构设计文档

## 1. 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 组件化 UI |
| 前端构建 | Vite 5 | 极速 HMR，生产构建 |
| UI 组件库 | MUI (Material UI) 5 | 企业级组件，亮/暗主题 |
| HTTP 客户端 | axios | 拦截器、统一错误处理 |
| 后端框架 | Express 4 | 轻量 Web 框架 |
| 数据库 | better-sqlite3 | 同步 API，单文件 SQLite |
| 定时调度 | node-cron | 分钟级 cron 调度 |
| Git 操作 | simple-git | 声明式 Git 操作封装 |
| 实时推送 | SSE (Server-Sent Events) | 任务状态实时广播 |
| 进程管理 | PM2 | 生产部署守护进程 |
| 容器化 | Docker + Docker Compose | 标准化部署 |
| 通知-邮件 | nodemailer | SMTP 邮件发送 |

## 2. 目录结构

```
gitsync/
├── docs/
│   ├── architecture.md              # 本文档
│   ├── tasks.md                     # 开发任务分解（历史）
│   ├── user-guide.html              # 使用手册
│   ├── deploy-guide.html            # 部署手册
│   ├── sequence-sync-flow.mermaid   # 同步流程时序图
│   └── sequence-task-create.mermaid # 任务创建时序图
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                         # 环境变量（不提交 git）
│   ├── data/                        # 运行时数据（不提交 git）
│   │   ├── gitsync.db               # SQLite 数据库
│   │   ├── repos/                   # bare repo 缓存
│   │   └── ssh_keys/                # SSH 私钥
│   └── src/
│       ├── index.ts                 # 入口：启动服务
│       ├── app.ts                   # Express 应用配置、路由挂载、SSE 端点
│       ├── config/
│       │   └── index.ts             # 环境变量加载与配置导出
│       ├── db/
│       │   └── index.ts             # 数据库初始化、连接管理、迁移
│       ├── models/
│       │   ├── task.ts              # Task CRUD + 状态更新 + SSE 广播
│       │   ├── syncLog.ts           # SyncLog CRUD + 分页查询 + 清理
│       │   └── setting.ts           # Setting KV 读写
│       ├── services/
│       │   ├── gitSync.ts           # Git 同步核心（clone/fetch/push + 详情统计）
│       │   ├── scheduler.ts         # 定时调度管理（注册/注销/重启）
│       │   ├── notifier.ts          # 通知服务（钉钉/飞书/邮件/Webhook）
│       │   └── eventBus.ts          # SSE 事件总线（广播任务状态变化）
│       ├── routes/
│       │   ├── tasks.ts             # /api/tasks 路由（含 list-branches）
│       │   ├── sync.ts              # /api/sync 路由（启停/手动触发）
│       │   ├── syncLogs.ts          # /api/sync-logs 路由
│       │   └── settings.ts          # /api/settings 路由（含通知测试）
│       ├── middleware/
│       │   ├── auth.ts              # Basic Auth（优先读 settings 表，fallback env）
│       │   └── errorHandler.ts      # 全局错误处理
│       ├── types/
│       │   └── index.ts             # 所有 TypeScript 类型定义
│       └── utils/
│           └── time.ts              # 本地时间格式化工具（nowLocal/formatLocal）
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts               # 开发代理 /api → localhost:3001
│   ├── index.html
│   └── src/
│       ├── main.tsx                 # React 入口
│       ├── App.tsx                  # 根组件（主题 + HashRouter + 路由）
│       ├── theme.ts                 # MUI 主题（亮/暗，主色 #6366F1）
│       ├── api/
│       │   └── index.ts             # axios 实例 + 所有 API 调用函数
│       ├── hooks/
│       │   ├── useTasks.ts          # 任务 CRUD + SSE 状态订阅
│       │   ├── useSyncLogs.ts       # 同步日志查询（分页、筛选）
│       │   ├── useSettings.ts       # 系统设置读写
│       │   └── useTaskEvents.ts     # SSE 订阅 Hook（自动重连）
│       ├── pages/
│       │   ├── DashboardPage.tsx    # 仪表盘（统计卡片 + 最近记录）
│       │   ├── TaskListPage.tsx     # 任务列表（卡片网格）
│       │   ├── TaskFormPage.tsx     # 任务创建/编辑（含分支多选）
│       │   ├── SyncLogPage.tsx      # 同步日志（双 Tab + 筛选）
│       │   └── SettingsPage.tsx     # 系统设置（通知策略 + 渠道 + 认证）
│       ├── components/
│       │   ├── Layout.tsx           # 全局布局（响应式侧边栏 + AppBar）
│       │   ├── Sidebar.tsx          # 左侧导航（支持收起）
│       │   ├── TaskCard.tsx         # 任务卡片（含下次同步倒计时）
│       │   ├── TaskStatusChip.tsx   # 状态标签组件
│       │   ├── SyncLogTable.tsx     # 日志表格（可展开分支详情）
│       │   ├── NotificationTest.tsx # 通知测试按钮
│       │   └── ThemeToggle.tsx      # 亮/暗主题切换
│       └── types/
│           └── index.ts             # 前端 TypeScript 类型
├── Dockerfile                       # 多阶段构建
├── docker-compose.yml               # 单机编排
├── ecosystem.config.js              # PM2 配置
├── .env.example                     # 环境变量模板
├── .gitignore
└── README.md
```

## 3. 数据结构

### 3.1 Task（同步任务）

```typescript
interface Task {
  id: string;                          // UUID v4
  name: string;                        // 任务名称
  sourceRepo: string;                  // 源仓库 URL（HTTPS 或 SSH）
  targetRepo: string;                  // 目标仓库 URL
  branch: string;                      // 兼容字段（旧版单分支，默认 'main'）
  branches: string;                    // JSON 字符串，分支同步配置
                                       // 示例: {"mode":"all"}
                                       // 示例: {"mode":"custom","branches":["main","dev"],"tags":["v1.0"]}
  syncFrequency: number;               // 同步频率（分钟）
  sourceAuthType: 'https_token' | 'ssh_key';
  sourceHttpsToken: string | null;     // 加密存储
  sourceSshKeyName: string | null;     // 私钥文件名
  targetAuthType: 'https_token' | 'ssh_key';
  targetHttpsToken: string | null;     // 加密存储
  targetSshKeyName: string | null;
  status: 'idle' | 'running' | 'stopped' | 'error';
  lastSyncAt: string | null;           // 本地时间字符串 "YYYY-MM-DD HH:mm:ss"
  lastSyncStatus: 'success' | 'failed' | null;
  lastSyncDuration: number | null;     // 毫秒
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 BranchesConfig（分支同步配置）

```typescript
// branches 字段的 JSON 结构
interface BranchesConfig {
  mode: 'all' | 'all_branches' | 'all_tags' | 'custom';
  branches?: string[];   // mode='custom' 时的分支列表
  tags?: string[];       // mode='custom' 时的标签列表
}
// mode 说明：
// 'all'          → 同步所有分支 + 所有标签（完整镜像）
// 'all_branches' → 只同步所有分支
// 'all_tags'     → 只同步所有标签
// 'custom'       → 只同步 branches + tags 指定的内容
```

### 3.3 SyncLog（同步日志）

```typescript
interface SyncLog {
  id: string;
  taskId: string;
  taskName: string;                    // 冗余字段，查询优化
  status: 'success' | 'failed';
  startTime: string;                   // 本地时间 "YYYY-MM-DD HH:mm:ss"
  endTime: string;
  duration: number;                    // 毫秒
  commitCount: number;                 // 本次同步的总 commit 数
  errorMessage: string | null;
  detail: string | null;               // JSON，分支/标签详情
  triggerType: 'cron' | 'manual';
  createdAt: string;
}

// detail 字段的 JSON 结构
interface SyncDetail {
  branches: { name: string; commits: number }[];  // 每个分支的 commit 数
  tags: { name: string; isNew: boolean }[];        // 标签及是否新增
  totalCommits: number;
  mode: string;
}
```

### 3.4 Setting（系统设置 KV）

```typescript
interface Setting {
  key: string;
  value: string;   // JSON 序列化的值
  updatedAt: string;
}

// 已使用的 key 列表：
// 'dingtalk_enabled'    → boolean
// 'dingtalk_webhook'    → string (URL)
// 'dingtalk_secret'     → string
// 'feishu_enabled'      → boolean
// 'feishu_webhook'      → string (URL)
// 'feishu_secret'       → string
// 'smtp_enabled'        → boolean
// 'smtp_host'           → string
// 'smtp_port'           → string
// 'smtp_secure'         → boolean
// 'smtp_user'           → string
// 'smtp_pass'           → string
// 'smtp_from'           → string
// 'smtp_to'             → string (逗号分隔多收件人)
// 'webhook_enabled'     → boolean
// 'webhook_url'         → string
// 'notify_on_success'   → boolean (默认 false，仅失败通知)
// 'auth_user'           → string (优先级高于 env AUTH_USER)
// 'auth_pass'           → string
```

### 3.5 SQLite DDL（当前实际表结构）

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_repo TEXT NOT NULL,
  target_repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  branches TEXT NOT NULL DEFAULT '{"mode":"all"}',
  sync_frequency INTEGER NOT NULL DEFAULT 30,
  source_auth_type TEXT NOT NULL DEFAULT 'https_token',
  source_https_token TEXT,
  source_ssh_key_name TEXT,
  target_auth_type TEXT NOT NULL DEFAULT 'https_token',
  target_https_token TEXT,
  target_ssh_key_name TEXT,
  status TEXT NOT NULL DEFAULT 'stopped',
  last_sync_at TEXT,
  last_sync_status TEXT,
  last_sync_duration INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  commit_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  detail TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'cron',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_task_id ON sync_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_start_time ON sync_logs(start_time);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

> **自动迁移**：服务启动时检测 `branches` 列和 `detail` 列是否存在，不存在则自动 `ALTER TABLE` 添加，无需手动操作。

## 4. API 接口

### 通用响应格式

```typescript
interface ApiResponse<T> {
  code: number;     // 0=成功，非0=错误
  data: T;
  message: string;
}
```

### 任务管理 `/api/tasks`

| 方法 | 路径 | 说明 | 响应 data |
|------|------|------|-----------|
| GET | `/api/tasks` | 获取所有任务 | `Task[]` |
| GET | `/api/tasks/:id` | 获取单个任务 | `Task` |
| POST | `/api/tasks` | 创建任务 | `Task` |
| PUT | `/api/tasks/:id` | 更新任务（自动重注册 cron） | `Task` |
| DELETE | `/api/tasks/:id` | 删除任务（清理本地 repo 缓存） | `{}` |
| POST | `/api/tasks/list-branches` | 获取远程仓库分支/标签列表 | `{ branches: string[], tags: string[] }` |

### 同步控制 `/api/sync`

| 方法 | 路径 | 说明 | 响应 data |
|------|------|------|-----------|
| POST | `/api/sync/:id/start` | 启动定时同步 | `{ taskId, status }` |
| POST | `/api/sync/:id/stop` | 停止定时同步 | `{ taskId, status }` |
| POST | `/api/sync/:id/trigger` | 手动触发（等待完成，返回结果） | `SyncLog` |

### 同步日志 `/api/sync-logs`

| 方法 | 路径 | 查询参数 | 响应 data |
|------|------|----------|-----------|
| GET | `/api/sync-logs` | `taskId, status, tab(recent/all), limit, offset` | `{ items: SyncLog[], total: number }` |
| GET | `/api/sync-logs/:id` | - | `SyncLog` |
| DELETE | `/api/sync-logs/:id` | - | `{}` |

### 系统设置 `/api/settings`

| 方法 | 路径 | 说明 | 响应 data |
|------|------|------|-----------|
| GET | `/api/settings` | 获取所有设置 | `Record<string, any>` |
| GET | `/api/settings/:key` | 获取单项 | `Setting` |
| PUT | `/api/settings/:key` | 更新设置 | `Setting` |
| POST | `/api/settings/test-notification` | 测试通知渠道 | `{ success: boolean, message: string }` |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查（无需认证） |
| GET | `/api/events` | SSE 实时事件流（无需认证） |

## 5. 核心服务设计

### 5.1 GitSync Service（gitSync.ts）

每次同步的执行步骤：

1. 读取任务配置，解析 `branches` JSON 得到 `BranchesConfig`
2. 更新任务状态为 `running`（触发 SSE 广播）
3. 准备工作目录 `data/repos/{taskId}/`
4. **Fetch 阶段**（使用 source 认证）：
   - 首次：`git clone --bare --origin origin <sourceUrl>`
   - 后续：`git fetch origin +refs/heads/*:refs/heads/* +refs/tags/*:refs/tags/* --prune`
5. **统计阶段**（push 前）：
   - `git ls-remote target` 获取目标仓库现有 refs
   - 对每个分支执行 `git rev-list --count target/<branch>..refs/heads/<branch>` 计算待推送 commit 数
6. **Push 阶段**（使用 target 认证，与 fetch 独立，避免 SSH key 冲突）：
   - 根据 `BranchesConfig` 构建 refspecs
   - `git push --force target <refspecs>`
7. 记录 `SyncLog`（含 `detail` JSON）
8. 更新任务状态为 `idle` 或 `error`（触发 SSE 广播）
9. 发送通知（失败必发；成功仅当 `notify_on_success=true` 时发）

### 5.2 Scheduler Service（scheduler.ts）

- 内部维护 `Map<string, ScheduledTask>` 存储活跃定时器
- `minutesToCron(minutes)` 将分钟数转为 6 字段 cron 表达式（`0 */N * * * *`）
- 服务启动时加载所有 `status='idle'` 的任务并注册
- 任务更新时若已注册则自动重注册（频率变更立即生效）
- 每日 00:00 执行日志清理（`deleteOldLogs(retentionDays)`）

### 5.3 EventBus Service（eventBus.ts）

- 维护 SSE 客户端连接集合 `Set<Response>`
- `broadcast(event, data)` 向所有连接的客户端推送事件
- `updateTaskStatus()` 调用后自动广播 `taskStatusChange` 事件
- 前端 `useTaskEvents` Hook 订阅，自动重连（3秒间隔）

### 5.4 Notifier Service（notifier.ts）

- 支持 4 个渠道：钉钉 / 飞书 / 邮件(SMTP) / 通用 Webhook
- 通知策略：失败必发；成功仅当 `notify_on_success=true`
- 飞书签名：`HMAC-SHA256(timestamp\nsecret, key='')` → base64
- 钉钉签名：`HMAC-SHA256(timestamp\nsecret, key=secret)` → base64 → URL encode
- 所有通知异步发送，不阻塞同步流程

### 5.5 Auth Middleware（auth.ts）

认证凭据优先级：**settings 表 > 环境变量**

- 若 settings 表中 `auth_user` + `auth_pass` 均有值，使用 settings 表的值
- 否则 fallback 到 `AUTH_USER` / `AUTH_PASS` 环境变量
- 两者均为空则跳过认证

### 5.6 时间处理（utils/time.ts）

所有时间戳使用**本地时间**（非 UTC），格式 `YYYY-MM-DD HH:mm:ss`，避免时区显示偏差。

## 6. 前端路由

```
/           → DashboardPage   仪表盘
/tasks      → TaskListPage    任务列表
/tasks/new  → TaskFormPage    新建任务
/tasks/edit/:id → TaskFormPage 编辑任务
/logs       → SyncLogPage     同步日志
/settings   → SettingsPage    系统设置
```

使用 `HashRouter`，兼容静态文件托管（无需服务端路由配置）。

## 7. 部署架构

```
┌─────────────────────────────────────────┐
│           服务器（单机部署）              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │   Node.js 进程（端口 3001）      │    │
│  │                                 │    │
│  │  Express 静态托管 client/dist/  │    │
│  │  Express API  /api/*            │    │
│  │  Express SSE  /api/events       │    │
│  │         ↓                       │    │
│  │    SQLite (data/gitsync.db)     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  浏览器 → http://IP:3001               │
└─────────────────────────────────────────┘
```

**开发模式**（两个进程）：
- `client/` → Vite dev server（端口 5173，热更新）
- `server/` → tsx watch（端口 3001，API）
- Vite 将 `/api` 请求代理到 3001

**生产模式**（单进程）：
- `npm run build`（client）→ 生成 `client/dist/`
- `npm run build`（server）→ 生成 `server/dist/`
- `node server/dist/index.js` → 同时托管前端静态文件和 API

## 8. 安全设计

1. **Token 加密**：HTTPS Token 使用 AES-256-CBC 加密存储，密钥来自 `ENCRYPTION_KEY` 环境变量
2. **SSH Key 隔离**：私钥存放于 `data/ssh_keys/`，fetch/push 使用独立的 `GIT_SSH_COMMAND` 环境变量，避免 source/target 密钥冲突
3. **认证灵活性**：Basic Auth 可通过页面设置动态修改，无需重启服务
4. **日志安全**：同步日志不记录任何认证凭据
5. **Force Push**：同步使用 `--force`，目标仓库仅作镜像用途

## 9. 环境变量

```env
PORT=3001                    # 服务端口
DB_PATH=                     # 数据库路径（默认 data/gitsync.db）
REPO_DIR=                    # bare repo 缓存目录（默认 data/repos）
SSH_KEY_DIR=                 # SSH 私钥目录（默认 data/ssh_keys）
AUTH_USER=                   # Basic Auth 用户名（可被 settings 表覆盖）
AUTH_PASS=                   # Basic Auth 密码（可被 settings 表覆盖）
LOG_RETENTION_DAYS=7         # 日志保留天数
ENCRYPTION_KEY=              # Token 加密密钥（32位，留空则明文存储）
```
