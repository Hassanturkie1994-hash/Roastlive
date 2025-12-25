# 🎥 ROAST LIVE - Phase 4-5: Live Streaming Implementation

## ✅ BACKEND COMPLETE

### **New API Endpoints Created:**

```python
POST /api/streams/token
# Generate Agora RTC token for streaming
# Request: { channelName, uid, role }
# Response: { token, channelName, uid, appId }

POST /api/streams/create
# Create new live stream record
# Request: { hostId, title, channelName }
# Response: Stream object with ID

POST /api/streams/{stream_id}/end
# End a live stream
# Sets is_live = false

GET /api/streams/active
# Get all currently active streams
# Returns list of live streams

POST /api/streams/{stream_id}/viewer-count
# Update real-time viewer count
# Request: { count }
```

### **Agora Token Builder Integrated:**
- Using `agora-token-builder` Python library
- Token validity: 24 hours
- Role-based tokens (host=1, audience=2)
- Channel-specific tokens with UID

### **Server Updated:**
File: `/app/backend/server.py`
- Agora credentials loaded from env
- Token generation endpoint
- Stream CRUD operations
- MongoDB stream records

---

## 🚧 FRONTEND IN PROGRESS

### **Files Created:**

**1. Live Tab (Discovery)**
- `/app/frontend/app/(tabs)/live.tsx` ✅
- Shows active streams
- "Go Live" floating button
- Discover/Following tabs
- Search functionality ready

**2. Broadcast Screen** (Next to create)
- `/app/frontend/app/(tabs)/live/broadcast.tsx`
- Camera preview with expo-camera
- Stream title input
- Agora RTC integration
- Start/stop streaming
- Viewer count display
- Guest management panel

**3. Viewer Screen** (Next to create)
- `/app/frontend/app/(tabs)/live/viewer/[id].tsx`
- Video playback
- Real-time chat overlay
- Guest grid layout
- Like/follow/share buttons
- Gift button

**4. Components Needed:**
- `components/live/VideoGrid.tsx` - Dynamic layouts
- `components/live/LiveChat.tsx` - Chat overlay
- `components/live/GuestControls.tsx` - Mic/camera controls
- `components/live/GuestInviteModal.tsx` - 20-sec countdown
- `components/live/StreamStats.tsx` - Viewer count, duration

---

## 📋 IMPLEMENTATION PLAN

### **Phase 4-5 Breakdown:**

**Step 1: Go Live (Broadcast) ✅ Partially Complete**
- [x] Backend API endpoints
- [x] Agora token generation
- [x] Live tab UI
- [ ] Broadcast screen with camera
- [ ] Stream creation flow
- [ ] Agora RTC integration

**Step 2: Viewer Experience**
- [ ] Viewer screen with video player
- [ ] Real-time chat
- [ ] Viewer count sync
- [ ] Follow/like actions

**Step 3: Multi-Guest System**
- [ ] Guest invitation modal
- [ ] 20-second countdown timer
- [ ] Accept/decline flow
- [ ] Dynamic video layouts:
  - Solo: 1x1 full screen
  - 1 guest: 1x2 split
  - 2-4 guests: 2x2 grid
  - 5-9 guests: 3x3 grid
- [ ] Host highlighting
- [ ] Empty seat placeholders

**Step 4: Guest Controls**
- [ ] Self-controls (mute, leave)
- [ ] Host menu (remove, promote)
- [ ] Mic/camera status indicators
- [ ] Seat swapping

**Step 5: System Messages**
- [ ] "X joined the live"
- [ ] "X left the live"
- [ ] "X became moderator"
- [ ] "Host locked seats"

---

## 🔧 TECHNICAL ARCHITECTURE

### **Agora Integration:**

```typescript
// Configuration
const config = {
  appId: process.env.EXPO_PUBLIC_AGORA_APP_ID,
  channelName: `stream_${userId}_${timestamp}`,
  token: await fetchToken(),
  uid: userId,
};

// Host (Broadcaster)
RtcEngine.create(appId)
  .enableVideo()
  .joinChannel(token, channelName, uid, { role: 'host' })

// Viewer (Audience)
RtcEngine.create(appId)
  .enableVideo()
  .joinChannel(token, channelName, 0, { role: 'audience' })

// Multi-Guest
RtcEngine
  .setClientRole('broadcaster') // For guests
  .muteLocalAudioStream(false)
  .muteLocalVideoStream(false)
```

### **Video Layouts:**

```typescript
// Dynamic grid based on participant count
const getLayout = (count: number) => {
  if (count === 1) return { columns: 1, rows: 1 }; // Solo
  if (count === 2) return { columns: 2, rows: 1 }; // Split
  if (count <= 4) return { columns: 2, rows: 2 }; // 2x2
  if (count <= 6) return { columns: 3, rows: 2 }; // 3x2
  if (count <= 9) return { columns: 3, rows: 3 }; // 3x3
  return { columns: 3, rows: 3 }; // Max 10 (1 host + 9 guests)
};
```

### **Real-time Sync:**

```typescript
// Supabase Realtime for chat
supabase
  .channel(`stream:${streamId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `stream_id=eq.${streamId}`
  }, handleNewMessage)
  .subscribe()

// Viewer count updates
supabase
  .channel(`stream:${streamId}:presence`)
  .track({ user_id: userId })
  .subscribe()
```

---

## 📊 DATABASE SCHEMA

### **Streams Table (Supabase):**
```sql
CREATE TABLE streams (
  id UUID PRIMARY KEY,
  host_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  channel_name TEXT UNIQUE NOT NULL,
  is_live BOOLEAN DEFAULT true,
  viewer_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 10,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Stream Guests:**
```sql
CREATE TABLE stream_guests (
  id UUID PRIMARY KEY,
  stream_id UUID REFERENCES streams(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('host', 'guest')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

### **Messages (Live Chat):**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  stream_id UUID REFERENCES streams(id),
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  pinned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 NEXT STEPS TO COMPLETE PHASE 4-5

### **Priority 1: Broadcast Screen**
Create `/app/frontend/app/(tabs)/live/broadcast.tsx`:
- Camera preview using expo-camera
- Stream title input
- Generate Agora token from backend
- Initialize Agora RTC engine
- Join channel as broadcaster
- Display viewer count
- End stream button

### **Priority 2: Viewer Screen**
Create `/app/frontend/app/(tabs)/live/viewer/[id].tsx`:
- Fetch stream details from Supabase
- Generate viewer token
- Join Agora channel as audience
- Render video player
- Show live chat
- Display viewer count

### **Priority 3: Live Chat**
Create `/app/frontend/components/live/LiveChat.tsx`:
- Real-time message display
- Chat input
- Supabase Realtime subscription
- Username + badge display
- System messages

### **Priority 4: Multi-Guest**
- Guest invitation system
- Dynamic video grid
- Guest controls
- Seat management

---

## 📦 DEPENDENCIES STATUS

### **Backend:**
```
✅ agora-token-builder==1.0.0
✅ openai
✅ motor (MongoDB async)
✅ fastapi
✅ python-dotenv
```

### **Frontend:**
```
✅ react-native-agora
✅ agora-react-native-rtm
✅ expo-camera
✅ expo-av
✅ @supabase/supabase-js
✅ lottie-react-native
```

---

## 🔐 PERMISSIONS NEEDED

### **iOS (info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>Roast Live needs camera access for live streaming</string>
<key>NSMicrophoneUsageDescription</key>
<string>Roast Live needs microphone access for audio</string>
```

### **Android (AndroidManifest.xml):**
```xml
<uses-permission android:name=\"android.permission.CAMERA\" />
<uses-permission android:name=\"android.permission.RECORD_AUDIO\" />
<uses-permission android:name=\"android.permission.INTERNET\" />
```

---

## 🧪 TESTING PLAN

### **Test Scenarios:**
1. **Solo Streaming:**
   - Host starts stream
   - Viewers join and see video
   - Chat works in real-time
   - Stream ends properly

2. **Multi-Guest (2-10 participants):**
   - Host invites guest
   - Guest receives invite modal
   - 20-second countdown works
   - Guest accepts and joins
   - Video grid adjusts dynamically
   - Guest can mute/unmute
   - Host can remove guest

3. **Chat & Moderation:**
   - Messages appear instantly
   - AI moderation blocks toxic messages
   - Pin comment works
   - System messages display

4. **Edge Cases:**
   - Network interruption
   - Guest leaves unexpectedly
   - Host ends stream abruptly
   - Max 10 participants enforced

---

## ⚡ PERFORMANCE CONSIDERATIONS

### **Optimization Strategies:**

**1. Video Quality:**
- Adaptive bitrate based on network
- Max resolution: 720p for mobile
- Frame rate: 24fps (sufficient for roast battles)

**2. Chat Performance:**
- Message batching (10 messages/second max)
- Lazy loading for history
- Virtual scrolling for long chats

**3. Memory Management:**
- Release camera when app backgrounds
- Clean up Agora engine on unmount
- Unsubscribe from real-time channels

**4. Battery Optimization:**
- Reduce video quality on low battery
- Disable video preview when minimized

---

## 🚨 KNOWN LIMITATIONS

### **Expo Go:**
- Agora RTC may not work in Expo Go
- Need development build for full testing
- Camera permissions need native build

### **Solution:**
- Create mock streaming mode for Expo Go preview
- Show video placeholder
- Test full features in development build

---

## 📝 IMPLEMENTATION ESTIMATE

| Component | Complexity | Time Estimate |
|-----------|------------|---------------|
| Backend APIs | ✅ DONE | 1 hour |
| Live Tab | ✅ DONE | 0.5 hours |
| Broadcast Screen | 🚧 HIGH | 2 hours |
| Viewer Screen | 🚧 HIGH | 2 hours |
| Multi-Guest System | 🚧 VERY HIGH | 3 hours |
| Live Chat | 🚧 MEDIUM | 1.5 hours |
| Guest Controls | 🚧 MEDIUM | 1 hour |
| Testing & Polish | 🚧 MEDIUM | 2 hours |
| **TOTAL** | | **13 hours** |

---

## 🎉 WHAT'S WORKING NOW

✅ Backend ready for streaming  
✅ Agora token generation  
✅ Stream CRUD operations  
✅ Live tab with "Go Live" button  
✅ MongoDB stream storage  
✅ Environment configured  

**Next:** Build the actual Broadcaster and Viewer screens!

---

**Status:** Phase 4-5 - 20% Complete  
**Last Updated:** December 24, 2024  
**Ready for:** Broadcast & Viewer screen implementation
