-- Public вэбсайтын текст — админ засварлах

create table if not exists public.public_site_content (
  id text primary key default 'main',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.public_site_content enable row level security;

drop policy if exists "public_site_content_read" on public.public_site_content;
create policy "public_site_content_read" on public.public_site_content
  for select to anon, authenticated using (true);

drop policy if exists "public_site_content_admin_write" on public.public_site_content;
create policy "public_site_content_admin_write" on public.public_site_content
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin'))
  );

grant select on public.public_site_content to anon;
grant select, insert, update, delete on public.public_site_content to authenticated;

notify pgrst, 'reload schema';
