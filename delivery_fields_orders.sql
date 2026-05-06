alter table public.orders
  add column if not exists delivery_fee numeric default 0,
  add column if not exists delivery_distance_km numeric,
  add column if not exists manual_address text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;
