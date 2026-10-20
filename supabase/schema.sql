-- =========================================================
-- 命途回廊 · COINFALL — Supabase 初始化 SQL
-- 在 Supabase SQL Editor 中整段执行。
--
-- 说明：
-- 1. 实际对局使用 Realtime Broadcast + Presence，不依赖任何表。
-- 2. coinfall_rooms 只用于可选的房间目录 / 状态记录。
-- 3. 下方 RLS 为“朋友局演示”配置，anon 可读写；公开生产环境
--    应改为 Edge Function 写入，并关闭 anon 的 insert/update。
-- =========================================================

create table if not exists public.coinfall_rooms (
  code        text primary key,
  host_name   text not null default '房主',
  mode        text not null default 'standard',
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.coinfall_rooms is '命途回廊联机房间目录（可选，实际对局走 Realtime Broadcast）';

create index if not exists coinfall_rooms_status_idx
  on public.coinfall_rooms (status, updated_at desc);

alter table public.coinfall_rooms enable row level security;

-- 读：任何人都可以看房间状态（大厅目录用）
drop policy if exists "coinfall rooms are readable" on public.coinfall_rooms;
create policy "coinfall rooms are readable"
  on public.coinfall_rooms
  for select
  using (true);

-- 写：匿名客户端可以登记/更新自己的房间。
-- 没有服务端身份，因此无法阻止恶意覆盖；演示用。
drop policy if exists "coinfall rooms can be created" on public.coinfall_rooms;
create policy "coinfall rooms can be created"
  on public.coinfall_rooms
  for insert
  with check (true);

drop policy if exists "coinfall rooms can be updated" on public.coinfall_rooms;
create policy "coinfall rooms can be updated"
  on public.coinfall_rooms
  for update
  using (true)
  with check (true);

-- 可选：只允许更新为 open/closed 之外的状态会被 check 约束拦截。
-- 可选：禁止删除，保持审计痕迹。
drop policy if exists "coinfall rooms cannot be deleted" on public.coinfall_rooms;
create policy "coinfall rooms cannot be deleted"
  on public.coinfall_rooms
  for delete
  using (false);

-- 可选清理函数：删除一天前的房间记录。
create or replace function public.coinfall_cleanup_rooms()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.coinfall_rooms
  where updated_at < now() - interval '1 day';
$$;

-- 如果项目启用了 pg_cron，可取消注释：
-- select cron.schedule(
--   'coinfall-cleanup',
--   '*/30 * * * *',
--   $$select public.coinfall_cleanup_rooms()$$
-- );

-- 验证：
-- select * from public.coinfall_rooms order by updated_at desc limit 20;