-- =====================================================================
-- 02_seed.sql · Datos SINTÉTICOS (ningún dato personal real)
-- Ejecutar después de 01_schema.sql. Se puede relanzar (reinicia datos).
-- =====================================================================
truncate table public.orders, public.customers, public.products,
               public.categories, public.documents restart identity cascade;

insert into public.categories (name) values
  ('Electrónica'),('Hogar'),('Deportes'),('Oficina'),('Juguetes'),('Alimentación');

insert into public.products (sku, name, category_id, price, stock)
select 'SKU-' || lpad(g::text, 4, '0'),
       (array['Teclado','Ratón','Monitor','Silla','Lámpara','Mochila','Botella','Balón','Cuaderno','Auriculares'])[1 + (g % 10)]
         || ' ' || (array['Pro','Lite','Max','Eco','Plus'])[1 + (g % 5)] || ' ' || g,
       (select id from public.categories order by id offset (g % 6) limit 1),
       round((5 + (g * 7 % 190) + (g % 10) * 0.99)::numeric, 2),
       (g * 13) % 80
from generate_series(1, 40) g;

insert into public.customers (full_name, email, phone, city)
select 'Cliente Demo ' || g,
       'cliente' || g || '@example.com',
       '000 000 ' || lpad(g::text, 3, '0'),
       (array['Madrid','Barcelona','Valencia','Sevilla','Bilbao'])[1 + (g % 5)]
from generate_series(1, 30) g;

insert into public.orders (customer_id, status, total, created_at)
select 1 + floor(random() * 30)::int,
       case when r < 0.15 then 'pending'
            when r < 0.55 then 'paid'
            when r < 0.90 then 'shipped'
            else 'cancelled' end,
       round((20 + random() * 480)::numeric, 2),
       now() - (random() * interval '365 days')
from (select random() as r from generate_series(1, 200)) s;
