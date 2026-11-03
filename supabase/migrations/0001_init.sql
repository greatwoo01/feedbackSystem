-- 学生学习反馈系统 - 迁移 0001：初始表结构与 RLS
-- 全新环境在 Supabase Dashboard -> SQL Editor 中执行一次。
-- 注意：本文件代表已上线的历史状态，请勿修改；后续变更请新建编号更大的文件。
-- 已部署环境无需重复执行本文件（会因策略已存在而报错），从 0002 继续即可。

-- 1. 教师表
create table if not exists public.teachers (
  id serial primary key,
  name varchar not null,
  phone varchar,
  email varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 2. 班级表
create table if not exists public.classes (
  id serial primary key,
  name varchar not null,
  teacher_id integer references public.teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 3. 学生表
create table if not exists public.students (
  id serial primary key,
  name varchar not null,
  gender varchar,
  parent_phone varchar,
  class_id integer references public.classes(id) on delete set null,
  birthday timestamptz,
  grade varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 4. 反馈表
create table if not exists public.feedbacks (
  id serial primary key,
  class_id integer not null references public.classes(id) on delete cascade,
  student_id integer not null references public.students(id) on delete cascade,
  class_date timestamptz not null,
  teaching_content text,
  homework_content text,
  homework_score integer,
  exercise_score integer,
  thinking_score integer,
  performance_score integer,
  overall_score integer,
  evaluation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- 启用 RLS
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.feedbacks enable row level security;

-- 允许 anon 角色全部读写（内部管理系统，访问控制由 Basic Auth 中间件负责）
create policy "allow all for anon" on public.teachers
  for all to anon using (true) with check (true);
create policy "allow all for anon" on public.classes
  for all to anon using (true) with check (true);
create policy "allow all for anon" on public.students
  for all to anon using (true) with check (true);
create policy "allow all for anon" on public.feedbacks
  for all to anon using (true) with check (true);
