# 🚨 CRITICAL: Database Setup Required

## Overview
You have **MULTIPLE** database schema files that need to be applied to your Supabase instance for all the new features to work. This document consolidates all required SQL files and the order in which they should be applied.

---

## ⚠️ IMPORTANT NOTES

1. **All SQL files must be run in your Supabase SQL Editor**
2. **Run them in the order listed below**
3. **Some files may have dependencies on previous ones**
4. **Check for any errors after running each file**
5. **Backup your database before making changes**

---

## 📋 Required SQL Files (In Order)

### 1. **RUN_THIS_NOW.sql** (HIGHEST PRIORITY)
**Location:** `/app/RUN_THIS_NOW.sql`

**What it does:**
- Critical auth fixes
- Core user management
- Essential database functions

**Status:** ⚠️ **MUST RUN FIRST** - Contains critical fixes from previous session

---

### 2. **SUPABASE_SETUP_MATCHMAKING.md**
**Location:** `/app/SUPABASE_SETUP_MATCHMAKING.md`

**What it does:**
- Battle matchmaking system
- Queue management
- Match creation and tracking
- Battle results and statistics

**Features enabled:**
- ✅ Matchmaking queue
- ✅ Battle creation
- ✅ Winner determination
- ✅ Battle history

---

### 3. **SUPABASE_SETUP_CHAT_GIFTS.md**
**Location:** `/app/SUPABASE_SETUP_CHAT_GIFTS.md`

**What it does:**
- Live chat system
- Gift economy
- Wallet management
- Gift transactions

**Features enabled:**
- ✅ Live chat in battles
- ✅ Gift sending
- ✅ Wallet system
- ✅ Transaction history

---

### 4. **SUPABASE_SETUP_SOCIAL_FEATURES.md**
**Location:** `/app/SUPABASE_SETUP_SOCIAL_FEATURES.md`

**What it does:**
- VIP Clubs
- Direct messaging
- Notifications system
- Followers/following
- User stories

**Features enabled:**
- ✅ VIP Clubs
- ✅ DMs between users
- ✅ Push notifications
- ✅ Social connections
- ✅ Stories (Instagram-style)

---

### 5. **SUPABASE_SETUP_DISCOVER_REPORTS_BLOCKS.md** (NEW)
**Location:** `/app/SUPABASE_SETUP_DISCOVER_REPORTS_BLOCKS.md`

**What it does:**
- Stream discovery and search
- Leaderboards system
- Reporting system
- User blocking

**Features enabled:**
- ✅ Discover/Explore page
- ✅ Leaderboards
- ✅ Report users/streams/chat
- ✅ Block/unblock users

---

## 🔧 How to Apply These Files

### Step-by-Step Instructions:

1. **Open Supabase Dashboard**
   - Go to your project at https://app.supabase.com
   - Navigate to the SQL Editor

2. **For Each File Above (in order):**
   - Open the file in your code editor
   - Copy all SQL statements
   - Paste into Supabase SQL Editor
   - Click "Run"
   - ✅ Check for success message
   - ⚠️ If errors appear, fix them before proceeding

3. **Verify Setup:**
   - Go to "Table Editor" in Supabase
   - Check that all new tables exist
   - Verify RLS policies are enabled

---

## 📊 Expected Database Tables After Setup

After running all SQL files, you should have these tables:

### Core Tables (Already Existed)
- `auth.users`
- `user_roles`
- `streams`
- `profiles`

### New Tables from Matchmaking
- `matchmaking_queue`
- `battle_matches`
- `battle_votes`
- `battle_results`

### New Tables from Chat & Gifts
- `chat_messages`
- `chat_rooms`
- `gifts`
- `gift_transactions`
- `wallets`
- `wallet_transactions`

### New Tables from Social Features
- `vip_clubs`
- `club_members`
- `conversations`
- `messages`
- `notifications`
- `follows`
- `stories`

### New Tables from Discover/Reports/Blocks
- `stream_tags`
- `stream_categories`
- `leaderboard_stats`
- `reports`
- `report_reasons`
- `blocked_users`

---

## 🧪 Testing After Setup

Once all SQL is applied, test these features:

### Critical Tests:
1. ✅ Can users join matchmaking queue?
2. ✅ Can battles be created?
3. ✅ Does live chat work in battles?
4. ✅ Can users send gifts?
5. ✅ Do wallet balances update correctly?

### Secondary Tests:
1. ✅ Can users create VIP clubs?
2. ✅ Do DMs work between users?
3. ✅ Are notifications appearing?
4. ✅ Does discover page show streams?
5. ✅ Are leaderboards populating?
6. ✅ Can users report content?
7. ✅ Does blocking work?

---

## ⚠️ Troubleshooting

### Common Issues:

**Issue:** "relation does not exist"
- **Fix:** You skipped a SQL file or ran them out of order. Run missing files.

**Issue:** "permission denied"
- **Fix:** Check RLS policies. Ensure `user_roles` table exists and has your user.

**Issue:** "duplicate key value"
- **Fix:** You ran the same SQL twice. Check if tables already exist.

**Issue:** "function does not exist"
- **Fix:** A required function wasn't created. Re-run the file that creates it.

---

## 🎯 Next Steps After Database Setup

1. **Test the application thoroughly**
2. **Report any bugs or issues you find**
3. **Identify which features need more logic/integration**
4. **Prioritize what to implement next**

---

## 📝 Notes

- **All features are currently UI scaffolds** - They display the interface but lack backend logic
- **Database schema is ready** - But API endpoints need to be implemented
- **Real-time features** - Will need Supabase Realtime channels configured
- **Agora SDK** - Still in demo mode, needs custom dev client

---

## ✅ Quick Checklist

Before proceeding with development, ensure:

- [ ] All 5 SQL files have been run
- [ ] No SQL errors occurred
- [ ] All tables exist in Supabase
- [ ] RLS policies are enabled
- [ ] You can see the tables in Table Editor
- [ ] Your user has a role in `user_roles` table

---

**Last Updated:** Current session
**Total SQL Files:** 5
**Estimated Time to Apply All:** 10-15 minutes
