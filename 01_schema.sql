-- =====================================================================
-- 01_schema.sql · Esquema, seguridad (RLS) y vistas
-- Proyecto DI 0488 · Sistema de Gestión (Ionic + Angular + Supabase)
-- Ejecutar UNA vez en Supabase > SQL Editor, ANTES de crear usuarios.
-- Sin datos personales ni contraseñas.
-- =====================================================================

-- 1) TABLAS ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id   bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.products (
  id          bigint generated always as identity primary key,
  sku         text not null unique,
  name        text not null,
  category_id bigint references public.categories(id) on delete set null,
  price       numeric(10,2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.customers (
  id         bigint generated always as identity primary key,
  full_name  text not null,
  email      text not null unique check (email = lower(email)),
  phone      text,
  city       text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending','paid','shipped','cancelled')),
  total       numeric(12,2) not null check (total >= 0),
  created_at  timestamptz not null default now()
);

-- "NoSQL" simulada: colecciones de documentos JSON con tiempo real
create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  collection text not null,
  data       jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists documents_collection_created_idx
  on public.documents (collection, created_at desc);
create index if not exists documents_data_gin on public.documents using gin (data);

-- 2) FUNCIONES ---------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, split_part(new.email, '@', 1), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rellena perfiles de usuarios creados antes del trigger (si los hubiera)
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, split_part(u.email, '@', 1), 'user' from auth.users u
on conflict (id) do nothing;

-- 3) VISTAS (consolidan datos; respetan RLS con security_invoker) -------
create or replace view public.v_kpis with (security_invoker = true) as
select
  (select count(*) from public.products)::int  as total_products,
  (select count(*) from public.customers)::int as total_customers,
  (select count(*) from public.orders)::int    as total_orders,
  (select coalesce(sum(total),0) from public.orders where status <> 'cancelled')::numeric(14,2) as total_revenue,
  (select count(*) from public.products where stock < 10)::int as low_stock_products;

create or replace view public.v_products_by_category with (security_invoker = true) as
select c.id as category_id,
       c.name as category,
       count(p.id)::int as products,
       coalesce(sum(p.stock),0)::int as units_in_stock
from public.categories c
left join public.products p on p.category_id = c.id
group by c.id, c.name
order by c.name;

-- 4) SEGURIDAD: RLS ----------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.customers  enable row level security;
alter table public.orders     enable row level security;
alter table public.documents  enable row level security;

-- profiles: cada usuario ve el suyo, el admin ve todos; solo el admin modifica (nadie se auto-asciende)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- categories / products / orders: lectura para todos; escritura solo admin
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select to authenticated using (true);
drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated using (true);
drop policy if exists products_write on public.products;
create policy products_write on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated using (true);
drop policy if exists orders_write on public.orders;
create policy orders_write on public.orders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- customers: ambos roles leen, crean y editan; solo admin borra
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated using (true);
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated with check (true);
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated using (true) with check (true);
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated
  using ((select public.is_admin()));

-- documents: leer todos, insertar solo como uno mismo, borrar solo admin
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated using (true);
drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete to authenticated
  using ((select public.is_admin()));

-- 5) PERMISOS (Data API) Y TIEMPO REAL -----------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.documents;
exception when duplicate_object then null;
end $$;
