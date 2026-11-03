# 学生学习反馈系统

教师课后评价的录入、查询与家长反馈文案生成工具。单人使用的内部系统，部署在 Cloudflare Workers 上，数据库托管在 Supabase。

## 功能

- **教师 / 班级 / 学生管理**：维护基础资料，班级归属教师，学生归属班级
- **课后反馈**：选班级后一次性为全班学生录入评价（课堂内容、作业、5 项评分、评语）
- **查询与筛选**：按日期范围、学生姓名、班级过滤；同一天内按班级编号、学生编号倒序稳定排序
- **Excel 导入 / 导出**：导出历史评价为 xlsx；导入历史 xlsx（自动匹配班级与学生、按「学生+日期」去重、日期与评分格式容错）
- **家长反馈图**：将评价渲染为图片下载，便于发送给家长
- **软删除**：删除只打 `deleted_at` 标记，可在数据库恢复，不再级联销毁历史反馈

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| UI | shadcn/ui（Radix）+ Tailwind CSS 4 |
| 数据库 | Supabase（PostgreSQL），服务端通过 `@supabase/supabase-js` 访问 |
| 部署 | Cloudflare Workers，使用 `@opennextjs/cloudflare` 适配器 |
| 包管理 | **仅 pnpm**（`preinstall` 会拦截 npm/yarn） |

Excel 解析与图片生成都在浏览器端完成，服务端只做数据读写，避免占用 Workers 的 CPU 配额。

## 目录结构

```
src/
├── app/
│   ├── page.tsx                      # 主页（教师/学生/班级/反馈 四个页签）
│   ├── layout.tsx
│   └── api/
│       ├── teachers/route.ts         # GET / POST / PUT / DELETE
│       ├── classes/route.ts
│       ├── students/route.ts
│       └── feedbacks/route.ts
├── components/
│   ├── TeachersManagement.tsx
│   ├── StudentsManagement.tsx
│   ├── ClassesManagement.tsx
│   ├── FeedbackManagement.tsx        # 含 Excel 导入导出、家长反馈图
│   ├── TopNav.tsx
│   └── ui/                           # shadcn/ui 组件
├── storage/database/supabase-client.ts  # Supabase 客户端（读取环境变量）
└── middleware.ts                     # Basic Auth（保护全站与 API）

supabase/migrations/                  # 数据库迁移（按编号顺序执行）
scripts/
├── backup.mjs                        # 导出全库快照到 backups/
└── backup-task.cmd                   # 供 Windows 任务计划程序调用
```

## 本地开发

```bash
pnpm install
```

创建 `.dev.vars`（已被 `.gitignore` 忽略，不要提交）：

```ini
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx

BASIC_AUTH_USER=mew01
BASIC_AUTH_PASS=<本地调试密码>
```

两种运行方式：

```bash
pnpm dev            # 纯 Next.js 开发服务器，最快，读取 .env 而不是 .dev.vars
pnpm run cf:preview # 在本地 Workers 运行时（workerd）预览，读取 .dev.vars，行为与线上一致
```

> `pnpm dev` 不会加载 `.dev.vars`。要在 `next dev` 下跑通接口，需要另外提供同名环境变量（例如在终端 `setx` 或临时 `$env:SUPABASE_URL=...`）。日常调试建议直接用 `cf:preview`。

Windows 下 `cf:preview` 若报 `EPERM ... xdg.config\.wrangler`，先执行：

```powershell
$env:XDG_CONFIG_HOME='D:\code\feedback_ok\.wrangler\xdg'
```

## 数据库

首次初始化按编号顺序执行迁移（Supabase Dashboard → SQL Editor，或 Supabase CLI）：

| 文件 | 内容 |
|---|---|
| `supabase/migrations/0001_init.sql` | 建 4 张表 + 启用 RLS + anon 读写策略 |
| `supabase/migrations/0002_soft_delete.sql` | 加 `deleted_at`；外键由 cascade/set null 改为 restrict |

规则：**已执行的文件不要改**，结构变更一律新建 `000N_xxx.sql`。

恢复误删记录：

```sql
update public.feedbacks set deleted_at = null where id = <id>;
-- students / classes / teachers 同理
```

## 部署到 Cloudflare Workers

```bash
# 1. 配置生产环境变量（一次性；交互式粘贴值，不要写进任何文件）
pnpm wrangler secret put SUPABASE_URL
pnpm wrangler secret put SUPABASE_ANON_KEY
pnpm wrangler secret put BASIC_AUTH_USER
pnpm wrangler secret put BASIC_AUTH_PASS

# 2. 部署
pnpm run cf:deploy

# 3. 查看线上日志
pnpm wrangler tail
```

**顺序很重要**：必须先把 4 个 secret 设置好再部署，否则 `middleware` 会返回 503（失败关闭，防止漏配导致站点裸奔）。

若重命名过环境变量，安全顺序是：设置新 secret → 部署新代码 → 删除旧 secret。secret 变更即时生效，不需要重新部署。

其他命令：

```bash
pnpm wrangler secret list          # 确认 secret 名称（不显示值）
pnpm run cf:build                  # 只构建不部署，产物在 .open-next/
```

## 访问控制

全站（页面与 `/api/*`）由 `src/middleware.ts` 的 Basic Auth 保护：

- 凭证来自 `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`
- 缺失这两个变量时返回 503，而不是放行
- 使用 `atob` 解码（Workers 与 Node 都可用）与恒定时间比较

注意：数据库 RLS 目前对 `anon` 全量放行，安全边界依赖这层 Basic Auth。多人共用或需要审计时，应改为 Supabase Auth + 按教师过滤的 RLS 策略。

## 备份

```bash
pnpm backup          # 生成 backups/YYYY-MM-DD.json（四张表全量），保留最近 8 份
```

Windows 任务计划程序已配置每周备份（任务名 `FeedbackSystem-Backup`，执行 `scripts\backup-task.cmd`，日志写入 `backups\backup.log`）。

Supabase 免费套餐没有自动备份，这份快照是唯一的历史副本，建议同时把 `backups/` 拷到网盘或私有仓库。

## 约定

- 包管理只用 pnpm
- 组件用 `'use client'` 标记客户端组件
- 所有异步操作必须有错误处理
- 数据库字段使用 snake_case
- 结构变更走 `supabase/migrations/`，不要直接改线上
