-- Public вэб сайтын блог / мэдээний хүснэгт
-- Supabase SQL Editor дээр ажиллуулна.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid,
  author_name text,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  featured_image text,
  source_urls jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_created_idx on public.blog_posts (created_at desc);
create index if not exists blog_posts_slug_idx on public.blog_posts (slug);

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_public_select" on public.blog_posts;
create policy "blog_posts_public_select" on public.blog_posts
  for select using (published);

drop policy if exists "blog_posts_admin_write" on public.blog_posts;
create policy "blog_posts_admin_write" on public.blog_posts
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.blog_posts'; exception when others then null; end;
end $$;
