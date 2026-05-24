# GitSync 开发任务记录

> 本文档记录项目开发阶段的任务分解，所有任务均已完成。

## 已完成功能清单

### 核心功能
- [x] 任务 CRUD（创建/编辑/删除/查询）
- [x] 定时同步（分钟级，基于 node-cron）
- [x] 手动触发同步（同步等待，返回结果）
- [x] 分支/标签灵活选择（全量/仅分支/仅标签/自定义多选）
- [x] 远程分支列表获取（`git ls-remote`）
- [x] HTTPS Token 认证（AES-256-CBC 加密存储）
- [x] SSH Key 认证（source/target 独立 env，避免冲突）
- [x] 删除任务自动清理本地 bare repo 缓存

### 同步日志
- [x] 同步日志记录（含开始/结束时间、耗时、状态）
- [x] 分支 commit 详情（每个分支的待推送 commit 数）
- [x] 标签同步状态（新增/已存在）
- [x] 日志分页查询（最近24h / 全量7天）
- [x] 日志自动清理（每日 00:00，可配置保留天数）

### 实时状态
- [x] SSE 实时推送（任务状态变化广播）
- [x] 前端自动订阅 SSE（useTaskEvents Hook，自动重连）

### 通知
- [x] 钉钉机器人通知（含签名验证）
- [x] 飞书机器人通知（含签名验证，修复官方签名算法）
- [x] 邮件通知（SMTP）
- [x] 通用 Webhook 通知（POST JSON）
- [x] 通知策略开关（仅失败 / 成功+失败）
- [x] 通知测试发送

### 前端页面
- [x] 仪表盘（任务统计、成功率、最近记录）
- [x] 任务列表（卡片式，含下次同步倒计时）
- [x] 任务表单（创建/编辑，含分支多选 UI）
- [x] 同步日志页（可展开分支详情）
- [x] 系统设置页（通知策略 + 渠道配置 + 访问认证）
- [x] 响应式侧边栏（移动端可收起）
- [x] 亮色/暗色主题（localStorage 持久化）

### 系统
- [x] Basic Auth（支持页面动态修改，无需重启）
- [x] 时间戳本地化（使用本地时间而非 UTC）
- [x] 数据库自动迁移（新字段自动 ALTER TABLE）
- [x] Docker 多阶段构建
- [x] PM2 ecosystem 配置
- [x] .gitignore（排除数据库、密钥、构建产物）

## 依赖包

### 后端（server/package.json）

```
express          Web 框架
better-sqlite3   SQLite 驱动（同步 API）
node-cron        定时调度
simple-git       Git 操作封装
nodemailer       SMTP 邮件
uuid             UUID 生成
dotenv           环境变量
cors             跨域支持
body-parser      请求体解析
```

### 前端（client/package.json）

```
react / react-dom        UI 框架
react-router-dom         路由（HashRouter）
@mui/material            MUI 组件库
@mui/icons-material      MUI 图标
@emotion/react           MUI 样式引擎
@emotion/styled          MUI styled
axios                    HTTP 客户端
```
