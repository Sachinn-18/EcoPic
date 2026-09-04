# Remaining Issues & Fixes - October 29, 2025

## Issue 1: "Invalid or expired token" when following tags

### Symptoms
- User clicks follow tag button
- Error toast shows "Invalid or expired token"
- Tag not added to followed tags

### Root Cause
- Token may have expired (15 minute expiration)
- API client should auto-refresh expired tokens via refresh endpoint
- Error interceptor should handle 401 responses and retry with new token

### Solution Applied
- Added debug logging to warn when no auth token is available
- Token refresh should automatically happen via interceptor on 401 response
- If token refresh fails, user gets redirected to login

### Files Modified
- `frontend/src/api/client.ts` - Added warning logs for missing tokens

### Testing
1. Login to app
2. Try to follow a tag immediately - should work
3. Wait 15+ minutes and try again - should trigger token refresh
4. If refresh fails, you should be redirected to login

### If Still Failing
1. Check browser DevTools → Application → Local Storage
2. Verify `auth_token` and `refresh_token` exist
3. Check browser console for warning about missing token
4. Check if token is actually being sent in network requests (DevTools → Network tab)

---

## Issue 2: Navbar credits don't match profile credits

### Symptoms
- Navigate to profile → See 300 credits
- Check navbar → See 400 credits  
- They don't match after purchase

### Root Cause
- Navbar displays user from Zustand store (updated on login)
- Profile fetches fresh data from API
- When credits are deducted, Zustand store updates but Navbar shows old value
- Zustand store didn't properly reflect the updateUser call

### Solution Applied
- Updated Navbar to use reactive `credits` variable derived from store
- `RedeemPage` already calls `updateUser()` to sync store
- Navbar now re-renders whenever user object in store changes

### Files Modified
- `frontend/src/components/Navbar.tsx` - Added credits variable and made it reactive

### How It Works Now
1. User makes purchase
2. `RedeemPage` calls `updateUser({ carbon_credits: result.remaining_credits })`
3. Zustand store updates
4. Navbar component re-renders
5. `credits` variable reflects new value
6. Navbar displays updated credits

### Testing
1. Note current navbar credits
2. Go to redeem page
3. Purchase an item
4. Check navbar - should show updated credits immediately
5. Navigate to profile - should match navbar credits

### If Still Not Matching
1. Check browser DevTools → React DevTools (if installed)
2. Verify that `user` object in Zustand store has new `carbon_credits`
3. Check network tab to see if API returned correct `remaining_credits`
4. Try clearing browser cache and refreshing page

---

## Token Refresh Flow (Automatic)

```
User Makes Request
    ↓
API Client adds auth token to headers
    ↓
Request sent to backend
    ↓
IF Backend Returns 401 (Expired)
    ↓
API Interceptor catches 401
    ↓
Tries to refresh token using refresh_token
    ↓
IF Refresh Successful
    ↓
New token stored in localStorage
    ↓
Original request retried with new token
    ↓
Request succeeds
    
IF Refresh Fails
    ↓
User redirected to login page
    ↓
Session cleared
```

---

## Debug Steps If Issues Persist

### For Token Issues
```javascript
// In browser console:
console.log(localStorage.getItem('auth_token'))
console.log(localStorage.getItem('refresh_token'))

// Should show JWT tokens (long strings), not null
```

### For Credit Display Issues  
```javascript
// In browser console (if React DevTools installed):
// Go to Components tab
// Find Navbar component
// Check props - should show current user with correct carbon_credits
```

### Check Network Requests
1. Open DevTools → Network tab
2. Follow a tag
3. Look for POST request to `/api/users/tags/follow`
4. Check if Authorization header is present
5. Check response status (should be 201 if successful, 401 if token expired)

---

## Known Limitations

1. **Token Expiry**: Access tokens expire every 15 minutes
   - Solution: Refresh token is used automatically
   - If both expire, user needs to login again

2. **Zustand Store Persistence**: Store persists to localStorage
   - Old data might be shown on page reload
   - Solution: Each page fetches fresh data from API

3. **Real-time Sync**: Multiple tabs won't stay in sync
   - Solution: Page refresh or logout/login to sync

---

## Next Steps

1. Test token expiration behavior:
   - Make a request, wait 15+ min, make another
   - Should auto-refresh without user notice

2. Test credit updates:
   - Make purchase
   - Verify navbar updates immediately
   - Verify profile matches

3. Monitor console for warnings
   - Look for "Invalid or expired token" messages
   - Check for missing auth token warnings

---

## Backend Health Checks

Make sure backend is running and auth is configured:

```bash
# Check backend is running
curl http://localhost:3001/health

# Should return: { "status": "ok", "timestamp": "..." }
```

---

## Production Considerations

- Consider increasing token expiry time for better UX
- Implement "Remember Me" option for longer sessions
- Add token refresh endpoint that client calls proactively
- Implement session timeout warnings
- Add logout on token expiry vs auto-refresh based on security needs
