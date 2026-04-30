create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  order_id uuid null references public.orders(id) on delete set null,
  created_at timestamp not null default now()
);

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

create index if not exists notifications_is_read_idx
  on public.notifications (is_read);
