# My Dashboard

个人财富与账号数据管理面板。

当前项目已经拆成 pnpm workspace：

```text
my-dashboard/
  frontend/   # Vue 3 + Vite 前端
  backend/    # NestJS + Prisma 后端
```

## 功能

### 前端

- 本地安全码门禁
- 财富页
  - 当前余额
  - 目标金额
  - FIRE 模式
  - 更新记录
  - 清空更新记录
- 后端设置页
  - 检测 API 连接
  - mock 微信登录
  - 查看当前后端用户
- 暗色 / 浅色 / 跟随系统主题
- PC / 移动端适配

### 后端（Phase 1）

- NestJS API
- PostgreSQL + Prisma
- JWT 认证
- mock 微信登录
- 当前用户查询
- 健康检查接口

当前后端只是第一阶段基础能力，暂时还没有做财富数据同步和密码库同步。

## 技术栈

### Frontend

- Vue 3
- Vite 5
- Vue Router
- Tailwind CSS
- localStorage / sessionStorage

### Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT

### Workspace

- pnpm workspace
- Docker Compose（本地 PostgreSQL）

## 项目结构

```text
my-dashboard/
  package.json              # workspace root scripts
  pnpm-workspace.yaml
  pnpm-lock.yaml
  docker-compose.yml

  frontend/
    package.json
    index.html
    vite.config.js
    tailwind.config.js
    postcss.config.js
    vercel.json
    public/
    src/

  backend/
    package.json
    nest-cli.json
    tsconfig.json
    .env.example
    prisma/
      schema.prisma
    src/
      main.ts
      app.module.ts
      auth/
      health/
      prisma/
```

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动前端

```bash
pnpm dev:web
```

默认地址：

```text
http://localhost:5174
```

### 3. 启动 PostgreSQL

需要本机安装 Docker。

```bash
docker compose up -d postgres
```

数据库配置见 [docker-compose.yml](docker-compose.yml)。

### 4. 配置后端环境变量

```bash
cd backend
cp .env.example .env
```

默认配置：

```env
DATABASE_URL="postgresql://dashboard:dashboard_dev@localhost:5432/my_dashboard?schema=public"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
CORS_ORIGIN="http://localhost:5174"
```

### 5. 初始化 Prisma

```bash
pnpm -C backend prisma generate
pnpm -C backend prisma migrate dev --name init
```

### 6. 启动后端

```bash
pnpm dev:api
```

默认地址：

```text
http://localhost:3000
```

## 常用命令

在仓库根目录执行：

```bash
pnpm dev:web       # 启动前端
pnpm build:web     # 构建前端
pnpm preview:web   # 预览前端构建产物

pnpm dev:api       # 启动后端
pnpm build:api     # 构建后端
pnpm lint:api      # 后端类型检查

pnpm build         # 构建前端 + 后端
```

## API

### Health

```http
GET /health
```

响应：

```json
{
  "ok": true,
  "service": "my-dashboard-api",
  "time": "2026-06-23T12:00:00.000Z"
}
```

### Mock WeChat Login

```http
POST /auth/dev-wechat-login
Content-Type: application/json
```

请求：

```json
{
  "mockOpenId": "dev-openid-chenkun",
  "nickname": "chenkun",
  "avatarUrl": ""
}
```

响应：

```json
{
  "accessToken": "jwt...",
  "user": {
    "id": "...",
    "wechatOpenId": "dev-openid-chenkun",
    "wechatUnionId": null,
    "nickname": "chenkun",
    "avatarUrl": ""
  }
}
```

### Current User

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

## 前端环境变量

前端 API 地址通过 `frontend/.env.local` 配置：

```bash
cd frontend
cp .env.local.example .env.local
```

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 部署说明

### 前端

前端仍可部署到 Vercel。

推荐在 Vercel 项目设置中把 Root Directory 设置为：

```text
frontend
```

`frontend/vercel.json` 已包含 Vue Router 的 SPA fallback：

```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

### 后端

后端目标部署环境是阿里云 ECS。

当前阶段只完成本地开发基础设施，尚未添加：

- API Dockerfile
- Nginx 配置
- HTTPS 配置
- ECS 部署脚本
- RDS / OSS 备份

这些属于后续阶段。

## 数据说明

### 前端本地数据

财富数据目前仍主要存在浏览器本地：

- `my-dashboard:balance`
- `my-dashboard:history`
- `my-dashboard:fire`
- `my-dashboard:theme`
- `my-dashboard:security-code-hash`
- `my-dashboard:security-verified`
- `my-dashboard:api-token`

### 后端数据

Phase 1 后端只存用户信息：

```prisma
model User {
  id            String   @id @default(cuid())
  wechatOpenId  String   @unique
  wechatUnionId String?
  nickname      String?
  avatarUrl     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

财富数据同步、密码库同步后续再做。

## 后续计划

- 接入真实微信登录
- 增加财富数据云同步
- 增加密码库加密同步
- 阿里云 ECS 部署
- Nginx + HTTPS
- PostgreSQL 迁移到 RDS
- OSS 备份
- 多设备冲突处理
