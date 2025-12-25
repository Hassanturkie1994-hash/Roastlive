# Roast Live - Complete Architecture Document

## Phase 1: Product Structure & Navigation

### Screen Map & Navigation Structure

#### 1. Authentication Flow
- `/auth/login` - Login screen
- `/auth/register` - Registration screen
- `/auth/forgot-password` - Password recovery
- `/auth/verify-email` - Email verification

#### 2. Main Navigation (Tabs)
- `/home` - Home feed (live streams, replays)
- `/discover` - User discovery, trending
- `/notifications` - Notification center
- `/inbox` - Direct messages
- `/profile` - User profile

#### 3. Live Streaming
- `/pre-live-setup` - **NEW** Pre-live setup flow
  - Solo stream setup
  - Battle stream setup (team size selection)
  - Permissions gate
- `/live/[streamId]` - Live stream room
  - Host controls
  - Guest seats (up to 9)
  - Viewer mode
  - Chat panel
  - Gift panel
- `/matchmaking` - **NEW** Battle matchmaking queue
  - Queue status
  - Team size selection
  - Match found modal

#### 4. Battle System
- `/battle/match/[matchId]` - Active battle room
  - Team layouts
  - Match timer
  - Score tracking
- `/battle/rematch/[matchId]` - **NEW** Rematch flow
  - Rematch acceptance
  - Participant tracking

#### 5. Replays
- `/replays` - Replay library
- `/replay/[replayId]` - Replay viewer

#### 6. Social Features
- `/profile/[userId]` - User profile
  - Posts tab
  - Stories tab
  - VIP club info
- `/posts/create` - Create post
- `/stories/create` - Create story
- `/follow/[userId]` - Follow/unfollow

#### 7. VIP Clubs
- `/vip/club/[clubId]` - VIP club page
- `/vip/join/[clubId]` - Join VIP flow
- `/vip/dashboard` - Creator VIP dashboard
  - Members list
  - Announcements
  - Badge customization
  - Revenue metrics

#### 8. Wallet & Economy
- `/wallet` - Wallet overview
- `/wallet/topup` - Add funds
- `/wallet/history` - Transaction history
- `/wallet/payout` - **NEW** Payout requests
- `/gifts/store` - Gift catalog

#### 9. Admin & Moderation
- `/admin/head-admin` - Head Admin dashboard
- `/admin/admin` - Admin dashboard
- `/admin/moderator` - Moderator dashboard
- `/admin/support` - Support dashboard
- `/admin/audit` - **NEW** Audit trail
- `/admin/reports` - User reports

#### 10. Settings
- `/settings` - App settings
- `/settings/account` - Account settings
- `/settings/privacy` - Privacy settings
- `/settings/blocked` - Blocked users

---

## User Roles & Permissions Matrix

### Role Definitions

#### 1. **Viewer** (Default Role)
- Basic authenticated user
- Can watch streams
- Can chat
- Can send gifts
- Can follow users
- Can create posts/stories

#### 2. **Host**
- All Viewer permissions +
- Can start streams (solo or battle)
- Can invite guests
- Can remove guests
- Can assign stream moderators
- Can pin messages
- Can lock/unlock seats
- Can end stream
- Earns from gifts received

#### 3. **Guest** (Temporary, per-stream)
- All Viewer permissions +
- Can participate in video (when invited and accepted)
- Can control own mic/camera
- Can leave seat voluntarily
- Earns from gifts if targeted

#### 4. **Stream Moderator** (Temporary, per-stream)
- All Viewer permissions +
- Can delete messages in that stream's chat
- Can timeout users in that stream
- Can pin messages
- Cannot remove guests (Host only)

#### 5. **Support** (Global Role)
- Can view all reports
- Can search users
- Cannot resolve reports
- Cannot ban users
- Read-only access to most admin data

#### 6. **Moderator** (Global Role)
- All Support permissions +
- Can resolve/dismiss reports
- Can delete content (posts, stories, messages)
- Can timeout users (temporary ban)
- Cannot permanently ban users

#### 7. **Admin** (Global Role)
- All Moderator permissions +
- Can permanently ban users
- Can unban users
- Can view analytics
- Can access wallet transaction logs
- Cannot manage other admins

#### 8. **Head Admin** (Global Role - Highest)
- All Admin permissions +
- Can assign/revoke admin roles
- Can access all system data
- Can manage VIP clubs
- Can approve payout requests
- Full audit trail access

---

## Permissions Matrix

### Streaming Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| Watch stream | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Start stream | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite guests | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Accept guest invite | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Remove guest | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lock/unlock seats | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| End stream | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Control own mic/cam | ✅* | ✅ | ✅ | ✅* | ✅* | ✅* | ✅* | ✅* |

*Only when seated as guest

### Chat Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| Send message | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own message | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any message | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Pin message | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Timeout user | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |

### Gift Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| Send gifts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receive gifts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View gift history | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | ✅ All | ✅ All |

### Wallet Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| View own balance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Top up wallet | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request payout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve payout | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View transaction logs | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | ✅ All | ✅ All |

### VIP Club Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| Join VIP club | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create VIP club | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage own club | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own |
| Manage any club | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Send announcements | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | 🔒 Own | ✅ All |

### Social Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| Follow users | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create posts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create stories | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send DMs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Block users | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Report users | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own content | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any content | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

### Admin Permissions

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| View reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Resolve reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ban users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Unban users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View audit trail | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage admins | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View analytics | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Battle Matchmaking Permissions (NEW)

| Action | Viewer | Host | Guest | Stream Mod | Support | Moderator | Admin | Head Admin |
|--------|--------|------|-------|------------|---------|-----------|-------|------------|
| Join queue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave queue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Accept match | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Request rematch | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Force match (debug) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Route Guards Implementation

### Route Guard Types

1. **AuthGuard**: Requires authentication
2. **RoleGuard**: Requires specific role
3. **OwnershipGuard**: Requires resource ownership
4. **PermissionGuard**: Requires specific permission

### Example Route Configurations

```typescript
// Public routes (no guard)
[
  { path: '/auth/login', guard: null },
  { path: '/auth/register', guard: null },
]

// Authenticated routes
[
  { path: '/home', guard: 'AuthGuard' },
  { path: '/profile/:userId', guard: 'AuthGuard' },
  { path: '/live/:streamId', guard: 'AuthGuard' },
]

// Role-based routes
[
  { path: '/admin/support', guard: 'RoleGuard', requiredRole: 'support' },
  { path: '/admin/moderator', guard: 'RoleGuard', requiredRole: 'moderator' },
  { path: '/admin/admin', guard: 'RoleGuard', requiredRole: 'admin' },
  { path: '/admin/head-admin', guard: 'RoleGuard', requiredRole: 'head_admin' },
]

// Ownership routes
[
  { path: '/vip/dashboard', guard: 'OwnershipGuard', resource: 'vip_club' },
  { path: '/wallet/payout', guard: 'OwnershipGuard', resource: 'wallet' },
]

// Permission-based routes
[
  { path: '/admin/audit', guard: 'PermissionGuard', permission: 'canViewLogs' },
  { path: '/admin/reports', guard: 'PermissionGuard', permission: 'canViewReports' },
]
```

---

## Implementation Notes

### Role Assignment
- Default role: **Viewer** (assigned on registration)
- **Host**: Automatically assigned when user starts a stream
- **Guest**: Temporary role assigned when user accepts invite and joins stream
- **Stream Moderator**: Assigned by host during stream (temporary)
- **Support/Moderator/Admin/Head Admin**: Assigned via `admin_roles` table

### Permission Checks
- Client-side: UI visibility (hide/show buttons)
- Server-side: API validation (enforce permissions)
- Real-time: WebSocket message filtering

### Badge System
- VIP badges: Show in host's streams only
- Stream mod badges: Show in that stream only
- Admin badges: Optional visibility toggle

---

## Next: Phase 1, Prompt 2 - Data Model Baseline

The database schema will be created in the next step to support all these features.
