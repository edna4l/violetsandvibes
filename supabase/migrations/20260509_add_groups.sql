-- Community groups (Facebook Groups style)
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general' CHECK (category IN (
    'general', 'city', 'identity', 'interests', 'support', 'activism', 'dating', 'friends'
  )),
  privacy text DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'secret')),
  cover_image text,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count integer DEFAULT 1 NOT NULL,
  post_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  like_count integer DEFAULT 0 NOT NULL,
  comment_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Anyone can view public groups"
  ON public.groups FOR SELECT
  USING (
    privacy = 'public'
    OR creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Owners and moderators can update group"
  ON public.groups FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role IN ('owner','moderator'))
  );

-- Group members policies
CREATE POLICY "Members can view other members in groups they belong to"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid())
  );

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Group posts policies
CREATE POLICY "Members can view group posts"
  ON public.group_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_posts.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can post in groups"
  ON public.group_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_posts.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Authors can delete own group posts"
  ON public.group_posts FOR DELETE
  USING (auth.uid() = author_id);

-- Seed some starter groups
INSERT INTO public.groups (name, description, category, privacy, creator_id, member_count)
SELECT
  g.name, g.description, g.category, 'public',
  (SELECT id FROM auth.users LIMIT 1),
  0
FROM (VALUES
  ('Queer Book Club', 'Read and discuss LGBTQ+ literature together', 'interests'),
  ('Pride Events', 'Organize and attend local pride events', 'activism'),
  ('Sapphic Support Circle', 'A safe space to share experiences and support each other', 'support'),
  ('WLW Dating Tips', 'Advice and stories from the community', 'dating'),
  ('Queer Hiking & Outdoors', 'Explore nature with your queer community', 'interests')
) AS g(name, description, category)
ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
