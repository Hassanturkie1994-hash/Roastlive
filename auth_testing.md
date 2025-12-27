# Auth Testing Playbook for Emergent Auth

## IMPORTANT - Testing Protocol

Do not be satisfied until you've tested the app completely, especially the auth-gated pages.

## Step 1: Create Test User & Session

```bash
# For Supabase - Create test user directly in Supabase
# Go to Supabase Dashboard → Authentication → Users → Add User
# Or use SQL:

INSERT INTO auth.users (id, email)
VALUES (gen_random_uuid(), 'test@example.com');
```

## Step 2: Test Backend API

```bash
# Test auth endpoints
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "http://localhost:8001/api/streams/active" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing

For Playwright testing:
```python
# Set auth cookie
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "localhost",
    "path": "/",
    "httpOnly": true,
    "secure": False,  # False for localhost
    "sameSite": "Lax"
}])

await page.goto("http://localhost:3000")
```

## Checklist

- [ ] User can sign in with Google OAuth
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to login when not authenticated
- [ ] Auth state syncs across all app screens
- [ ] Logout properly clears session
- [ ] Settings screens load user data correctly

## Success Indicators

- ✅ `/api/auth/me` returns user data
- ✅ Dashboard/main app loads without redirect
- ✅ User settings display correctly
- ✅ All authenticated features work

## Failure Indicators

- ❌ "User not found" errors
- ❌ 401 Unauthorized responses
- ❌ Redirect loop to login page
- ❌ Settings data not loading
