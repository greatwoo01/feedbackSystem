# 学生学习反馈系统 - 项目文档

## 项目概述

这是一个完整的学生学习反馈管理系统，用于管理教师、学生、班级信息，并记录课后反馈。

### 核心功能

1. **教师管理**：添加、编辑、删除教师信息
2. **学生管理**：管理学生基本信息（姓名、性别、家长电话、所属班级、生日、年级）
3. **班级管理**：创建班级、分配教师、查看班级学生
4. **课后反馈**：记录每次上课的学生表现评价

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **部署**: Cloudflare Workers（`@opennextjs/cloudflare`）

## 目录结构

```
├── public/                 # 静态资源
├── supabase/migrations/    # 数据库迁移 SQL（按编号执行）
├── scripts/                # 备份脚本（backup.mjs / backup-task.cmd）
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── api/            # API 路由
│   │   │   ├── teachers/   # 教师管理 API
│   │   │   ├── students/   # 学生管理 API
│   │   │   ├── classes/    # 班级管理 API
│   │   │   └── feedbacks/  # 反馈管理 API
│   │   ├── page.tsx        # 主页面
│   │   └── layout.tsx      # 根布局
│   ├── components/         # 业务组件
│   │   ├── TeachersManagement.tsx
│   │   ├── StudentsManagement.tsx
│   │   ├── ClassesManagement.tsx
│   │   └── FeedbackManagement.tsx
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── storage/database/   # 数据库配置
│   │   └── supabase-client.ts  # Supabase 客户端（读取 SUPABASE_URL / SUPABASE_ANON_KEY）
│   ├── middleware.ts       # Basic Auth，保护全站与 /api/*
│   └── lib/                # 工具库
├── wrangler.jsonc          # Cloudflare Worker 配置
├── open-next.config.ts     # OpenNext 适配器配置
├── next.config.ts          # Next.js 配置
└── package.json            # 项目依赖管理
```

## 数据库设计

### 表结构

#### teachers (教师表)
- id: serial (主键)
- name: varchar (教师姓名)
- phone: varchar (电话)
- email: varchar (邮箱)
- created_at: timestamp
- updated_at: timestamp

#### students (学生表)
- id: serial (主键)
- name: varchar (学生姓名)
- gender: varchar (性别)
- parent_phone: varchar (家长电话)
- class_id: integer (所属班级，外键)
- birthday: timestamp (生日)
- grade: varchar (年级)
- created_at: timestamp
- updated_at: timestamp

#### classes (班级表)
- id: serial (主键)
- name: varchar (班级名)
- teacher_id: integer (所属老师，外键)
- created_at: timestamp
- updated_at: timestamp

#### feedbacks (反馈表)
- id: serial (主键)
- class_id: integer (上课班级，外键，restrict)
- student_id: integer (学生ID，外键，restrict)
- class_date: timestamptz (上课日期)
- teaching_content: text (教学内容)
- homework_content: text (课后作业)
- homework_score / exercise_score / thinking_score / performance_score / overall_score: integer (1-5 评分)
- evaluation: text (学生评价，必填)
- deleted_at: timestamptz (软删除标记，非空表示已删除)
- created_at / updated_at: timestamptz

> 四张表均有 `deleted_at`，删除接口写入该字段而非物理删除；外键为 `restrict`，物理删除会被数据库阻止。

## API 接口

### 教师管理
- GET /api/teachers - 获取所有教师
- POST /api/teachers - 创建教师
- PUT /api/teachers - 更新教师
- DELETE /api/teachers?id={id} - 删除教师

### 学生管理
- GET /api/students - 获取所有学生（包含班级信息）
- POST /api/students - 创建学生
- PUT /api/students - 更新学生
- DELETE /api/students?id={id} - 删除学生

### 班级管理
- GET /api/classes - 获取所有班级（包含教师信息）
- POST /api/classes - 创建班级
- PUT /api/classes - 更新班级
- DELETE /api/classes?id={id} - 删除班级

### 反馈管理
- GET /api/feedbacks - 获取反馈列表
- POST /api/feedbacks - 创建反馈
- DELETE /api/feedbacks?id={id} - 删除反馈

## 开发规范

### 包管理
**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。

常用命令：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

### 数据库操作
- 表结构由 `supabase/migrations/` 下的 SQL 迁移文件定义，不引入 ORM
- 使用 Supabase Client（`src/storage/database/supabase-client.ts`）进行 CRUD 操作
- 字段名使用 snake_case 命名规范
- 所有表都必须配置 RLS 策略
- 结构变更必须新建 `000N_xxx.sql`，已执行的文件不可修改
- 删除一律为软删除（写 `deleted_at`），不要物理删除业务数据

### 代码规范
- 使用 'use client' 指令标记客户端组件
- 避免在 JSX 渲染逻辑中直接使用动态数据（防止 Hydration 错误）
- 所有异步操作必须有错误处理
- 使用 TypeScript 类型注解

### UI 设计
- 使用 shadcn/ui 组件库
- 遵循 Tailwind CSS 设计规范
- 响应式设计优先


