alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- POSTS: anyone signed in can read
create policy "posts_read_authenticated"
on public.posts for select
to authenticated
using (true);

-- POSTS: only author can create
create policy "posts_insert_own"
on public.posts for insert
to authenticated
with check (author_id = auth.uid());

-- POSTS: only author can update/delete
create policy "posts_update_own"
on public.posts for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create policy "posts_delete_own"
on public.posts for delete
to authenticated
using (author_id = auth.uid());

-- LIKES: signed in can read
create policy "likes_read_authenticated"
on public.post_likes for select
to authenticated
using (true);

-- LIKES: only like as yourself
create policy "likes_insert_own"
on public.post_likes for insert
to authenticated
with check (user_id = auth.uid());

create policy "likes_delete_own"
on public.post_likes for delete
to authenticated
using (user_id = auth.uid());

-- COMMENTS: signed in can read
create policy "comments_read_authenticated"
on public.post_comments for select
to authenticated
using (true);

-- COMMENTS: only comment as yourself
create policy "comments_insert_own"
on public.post_comments for insert
to authenticated
with check (author_id = auth.uid());

create policy "comments_delete_own"
on public.post_comments for delete
to authenticated
using (author_id = auth.uid());
