-- Add owner-controlled collapse + edit metadata support for social posts.

alter table public.posts
  add column if not exists collapsed_by_author boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists edited_at timestamptz;

create index if not exists posts_collapsed_by_author_idx
  on public.posts (collapsed_by_author);

create or replace function public.set_posts_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if coalesce(new.body, '') is distinct from coalesce(old.body, '')
     or coalesce(new.title, '') is distinct from coalesce(old.title, '') then
    new.edited_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_posts_timestamps on public.posts;
create trigger trg_set_posts_timestamps
before update on public.posts
for each row
execute function public.set_posts_timestamps();
