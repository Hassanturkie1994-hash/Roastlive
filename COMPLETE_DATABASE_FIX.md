# COMPLETE DATABASE RESET - Fixes All Registration Issues

## ⚠️ RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR

This will fix **ALL** registration and profile issues.

```sql
-- ============================================================================
-- STEP 1: CLEAN UP (Remove broken tables/triggers/policies)
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_profile();

-- ============================================================================
-- STEP 2: CREATE PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_followers ON public.profiles(followers_count DESC);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: RLS POLICIES (ALLOW EVERYTHING FOR TESTING)
-- ============================================================================

-- Allow anyone to view profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert (for trigger)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- STEP 4: AUTO-CREATE PROFILE TRIGGER (THE CRITICAL PART!)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  random_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
BEGIN
  -- Get username from metadata or generate from email
  random_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user' || substr(NEW.id::text, 1, 8)
  );

  -- Ensure username is unique (try up to 10 times)
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = random_username) INTO username_exists;
    
    IF NOT username_exists THEN
      EXIT;
    END IF;
    
    attempt_count := attempt_count + 1;
    random_username := COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ) || attempt_count;
    
    IF attempt_count > 10 THEN
      random_username := 'user_' || substr(NEW.id::text, 1, 12);
      EXIT;
    END IF;
  END LOOP;

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    random_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', random_username),
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    -- Try one more time with guaranteed unique username
    BEGIN
      INSERT INTO public.profiles (id, username, created_at)
      VALUES (NEW.id, 'user_' || NEW.id, NOW());
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Second attempt failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 5: AUTO-CREATE WALLET TRIGGER
-- ============================================================================

-- Make sure wallets table exists
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own wallet"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role can manage wallets"
  ON public.wallets FOR ALL
  TO service_role
  USING (true);

-- Create wallet trigger
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create wallet for new profile
  INSERT INTO public.wallets (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create wallet for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================================
-- STEP 6: GRANT ALL NECESSARY PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.wallets TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 7: TEST THE SETUP
-- ============================================================================

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_profile_created')
ORDER BY trigger_name;

-- Check table permissions
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('profiles', 'wallets')
AND grantee IN ('authenticated', 'service_role', 'anon')
ORDER BY table_name, grantee;
```

## ✅ What This Fixes

1. **Profiles auto-creation** - Trigger creates profile when user signs up
2. **Unique usernames** - Generates from email, adds numbers if duplicate
3. **Wallet auto-creation** - Creates wallet when profile is created
4. **RLS policies** - Allows profile creation without errors
5. **Error handling** - Doesn't block signup if something fails
6. **Permissions** - Grants all necessary access to authenticated users

## 🧪 Test After Running

Try registering with a new email. It should:
1. Create auth user ✅
2. Auto-create profile (via trigger) ✅
3. Auto-create wallet (via trigger) ✅
4. No database errors ✅

## 🔍 Debug Registration Issues

If registration still fails, run this to see the error:

```sql
-- Check recent auth users
SELECT id, email, created_at, confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check if profiles were created
SELECT p.id, p.username, p.created_at, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Check for orphaned auth users (users without profiles)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;
```

## 🆘 If Still Not Working

If you still get errors after running this, check:

1. **Supabase Auth is enabled**:
   - Go to Authentication → Settings
   - Enable Email Auth
   - Disable email confirmation (for testing)

2. **Check error message in app console**:
   - The AuthContext now logs detailed errors
   - Check Expo Go console for exact error

3. **Manual profile creation** for existing users:
```sql
-- Create profiles for all users that don't have one
INSERT INTO public.profiles (id, username, created_at)
SELECT 
  u.id,
  'user_' || substr(u.id::text, 1, 8),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```
