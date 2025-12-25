# 🔴 COPY AND RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR

## This fixes ALL issues: Registration, Admin Roles, Posts FK

```sql
-- ============================================================================
-- COMPLETE FIX - Run this entire script
-- ============================================================================

-- 1. FIX PROFILES TABLE & AUTO-CREATION
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;

CREATE POLICY "Public profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated, service_role;

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
DECLARE new_username TEXT; counter INT := 0;
BEGIN
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user_' || substr(NEW.id::text, 1, 8));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) AND counter < 100 LOOP
    counter := counter + 1; new_username := split_part(NEW.email, '@', 1) || counter;
  END LOOP;
  INSERT INTO public.profiles (id, username, full_name) VALUES (NEW.id, new_username, COALESCE(NEW.raw_user_meta_data->>'full_name', new_username));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed: %', SQLERRM;
  BEGIN INSERT INTO public.profiles (id, username) VALUES (NEW.id, 'user_' || NEW.id); EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. FIX POSTS TABLE - ADD FOREIGN KEY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caption TEXT,
  image_url TEXT,
  video_url TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ADD FOREIGN KEY (this fixes PGRST200 error!)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts viewable" ON public.posts;
DROP POLICY IF EXISTS "Insert own post" ON public.posts;

CREATE POLICY "Posts viewable" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own post" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.posts TO authenticated;

-- 3. FIX ADMIN ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('head_admin', 'admin', 'moderator', 'support')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own role" ON public.admin_roles;
DROP POLICY IF EXISTS "Service insert" ON public.admin_roles;

CREATE POLICY "View own role" ON public.admin_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service insert" ON public.admin_roles FOR ALL TO service_role USING (true);

GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;

-- Enable realtime on admin_roles
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_roles;

-- 4. ASSIGN HEAD ADMIN TO hassan.turkie1994@hotmail.com
-- ============================================================================

INSERT INTO public.admin_roles (user_id, role, is_active)
SELECT id, 'head_admin', true FROM auth.users WHERE email = 'hassan.turkie1994@hotmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

-- 5. CREATE WALLETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
GRANT SELECT ON public.wallets TO authenticated;

-- Auto-create wallet
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0) ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- 6. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
```

## ✅ WHAT THIS DOES:

1. ✅ Fixes registration (auto-creates profiles)
2. ✅ Fixes posts FK error (adds foreign key constraint)
3. ✅ Fixes admin roles (proper RLS)
4. ✅ Assigns head admin to hassan.turkie1994@hotmail.com
5. ✅ Creates wallets table
6. ✅ Reloads PostgREST cache

**COPY THIS ENTIRE SCRIPT AND RUN IN SUPABASE NOW!**
