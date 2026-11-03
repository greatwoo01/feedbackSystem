-- 学生学习反馈系统 - 迁移 0002：软删除 + 取消级联删除
-- 已于 2026-11-03 在生产环境执行（4 个外键 confdeltype 已确认为 r）。
-- 本脚本不删除任何数据：add column 全部可空，不重写现有行；可重复执行。

-- 1. 软删除标记
alter table public.teachers  add column if not exists deleted_at timestamptz;
alter table public.classes   add column if not exists deleted_at timestamptz;
alter table public.students  add column if not exists deleted_at timestamptz;
alter table public.feedbacks add column if not exists deleted_at timestamptz;

-- 2. 取消级联删除：删班级/学生不再连带删掉历史反馈，改为阻止物理删除
alter table public.feedbacks drop constraint if exists feedbacks_class_id_fkey;
alter table public.feedbacks add constraint feedbacks_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete restrict;

alter table public.feedbacks drop constraint if exists feedbacks_student_id_fkey;
alter table public.feedbacks add constraint feedbacks_student_id_fkey
  foreign key (student_id) references public.students(id) on delete restrict;

alter table public.students drop constraint if exists students_class_id_fkey;
alter table public.students add constraint students_class_id_fkey
  foreign key (class_id) references public.classes(id) on delete restrict;

alter table public.classes drop constraint if exists classes_teacher_id_fkey;
alter table public.classes add constraint classes_teacher_id_fkey
  foreign key (teacher_id) references public.teachers(id) on delete restrict;

-- 3. 查询辅助索引
create index if not exists feedbacks_deleted_at_idx on public.feedbacks (deleted_at);
create index if not exists students_deleted_at_idx  on public.students  (deleted_at);

-- 恢复单条（误删后用）：
-- update public.feedbacks set deleted_at = null where id = <id>;
