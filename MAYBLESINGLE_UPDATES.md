# .single() to .maybeSingle() Migration

## Summary

Updating all Supabase queries from `.single()` to `.maybeSingle()` where 0-row results are valid.

## Files to Update

### Services (Priority - High Usage)
1. **matchmakingService.ts** - 5 locations
2. **battleService.ts** - 4 locations
3. **xpService.ts** - 4 locations
4. **giftService.ts** - 7 locations
5. **streamService.ts** - 3 locations
6. **vipService.ts** - 1 location
7. **chatService.ts** - 2 locations
8. **postsService.ts** - 1 location
9. **followService.ts** - 1 location
10. **storiesService.ts** - 1 location

### Components
11. **LiveChat.tsx** (3 versions) - 3 locations
12. **GiftPicker.tsx** - 2 locations
13. **GiftPickerModal.tsx** - 1 location
14. **GiftOverlay.tsx** - 1 location

### App Screens
15. **profile.tsx** - 1 location
16. **broadcast.tsx** - 3 locations
17. **battle/match/[matchId].tsx** - 2 locations
18. **matchmaking.tsx** - 1 location
19. **wallet screens** - Multiple
20. **vip screens** - Multiple

## Total: ~60 locations

## Migration Strategy

### Pattern 1: Optional Data (Use .maybeSingle())
```ts
// BEFORE
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// AFTER
// Use maybeSingle to avoid error if profile doesn't exist
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();

if (error) {
  console.error('Database error:', error.message);
  return null;
}

if (!data) {
  console.log('No profile found');
  return null;
}

return data;
```

### Pattern 2: Must Exist (Keep .single() with try/catch)
```ts
// For INSERT operations where .single() is needed
try {
  const { data, error } = await supabase
    .from('battle_matches')
    .insert({...})
    .select()
    .single();  // Keep .single() here - we just inserted, must return 1 row
    
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Insert failed:', error);
  throw error;
}
```

## Implementation

I'll update these systematically in batches.
