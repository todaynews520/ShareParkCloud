# SharePark Cloud - Project Notes

## Project Overview
WeChat Mini Program for community parking spot sharing platform. Uses **points-based system** instead of currency.

## Key Technical Learnings

### 1. WeChat Cloud Database Commands

**CRITICAL: `_.add()` vs `_.inc()`**
```javascript
// ❌ WRONG - _.add() is for logical addition, requires TWO parameters
totalEarned: _.add(50)  // Error: _.add is not a function

// ✅ CORRECT - Use _.inc() for field increment
totalEarned: _.inc(50)  // Correct: increments field by 50
```

**Document Existence Check**
```javascript
// ❌ WRONG - Throws error if document doesn't exist
const user = await db.collection('users').doc(userId).get()
if (!user.data) { /* Never reached */ }

// ✅ CORRECT - Use .where() to safely check existence
const userResult = await db.collection('users').where({ _id: userId }).get()
if (userResult.data.length === 0) {
  // User doesn't exist, handle appropriately
}
```

### 2. Points System Constants
```javascript
INITIAL_POINTS = 1000      // New user signup bonus
PUBLISH_REWARD = 50         // Points earned when publishing a parking spot
BOOKING_COST = 10           // Fixed points cost for booking (regardless of duration)
DAILY_CHECKIN_REWARD = 10   // Daily sign-in reward
CONSECUTIVE_7_BONUS = 100   // Bonus for 7 consecutive check-ins (resets counter to 0)
```

### 3. Design System Colors (from PRD.md)
```css
--color-primary: #0d9488        /* Teal-600 - Main theme color */
--color-primary-light: #f0fdfa  /* Teal-50 - Light background */
--color-secondary: #10b981       /* Emerald-500 - Accent color */
--color-accent: #f97316          /* Orange-500 - For prices only */
--color-danger: #ef4444          /* Red-500 - For errors/cancellations */
--color-bg: #f0fdfa               /* Page background */
```

**Points Cards Gradient:**
```css
background: linear-gradient(135deg, #0d9488 0%, #10b981 100%);
/* Teal-600 → Emerald-500 */
```

### 4. Cloud Functions Structure

**Points Cloud Function** (`cloudfunctions/points/index.js`)
- Actions: `init`, `get`, `deduct`, `add`, `checkIn`
- Collection: `users`
- Uses OPENID as `_id` for user documents

**Publish Cloud Function** (`cloudfunctions/publish/index.js`)
- Actions: `create`, `list`, `cancel`
- Awards +50 points on successful publish
- Collection: `parking_releases`

**Book Cloud Function** (`cloudfunctions/book/index.js`)
- Actions: `create`, `pay`
- Checks if user has enough points (≥10) before creating order
- Deducts 10 points on payment
- Collection: `orders`

### 5. User Data Schema
```javascript
{
  _id: "openid",              // User's OpenID
  points: 1000,               // Current points balance
  totalEarned: 1000,          // Total points earned (lifetime)
  totalSpent: 0,              // Total points spent (lifetime)
  publishCount: 0,            // Number of spots published
  bookingCount: 0,            // Number of bookings made
  lastCheckInDate: "YYYY-MM-DD",  // Last check-in date
  consecutiveDays: 0,         // Current check-in streak
  totalCheckInDays: 0,        // Total check-ins (lifetime)
  createdAt: Date,
  updatedAt: Date
}
```

### 6. File Changes Summary

**Stage One (New Files):**
- `miniprogram/config/constants.js` - Points constants
- `miniprogram/services/pointsService.js` - Points service
- `cloudfunctions/points/index.js` - Points cloud function
- `cloudfunctions/points/package.json` - Package config

**Stage Two (Modified Files):**
- `miniprogram/pages/home/index.wxml` - Removed price display
- `miniprogram/pages/home/index.wxss` - Added status styles
- `miniprogram/services/orderService.js` - Fixed 10 points pricing
- `miniprogram/pages/publish/index.js` - Removed price, added points reward
- `miniprogram/pages/publish/index.wxml` - Removed price settings
- `miniprogram/pages/publish/index.wxss` - Added points reward card
- `miniprogram/pages/book/index.js` - Added points check
- `miniprogram/pages/book/index.wxml` - Shows "10积分" instead of currency
- `miniprogram/pages/profile/index.js` - Added points display and check-in
- `miniprogram/pages/profile/index.wxml` - Added points card
- `miniprogram/pages/profile/index.wxss` - Added points card styles
- `miniprogram/app.js` - Init points on login
- `cloudfunctions/publish/index.js` - Added +50 points reward
- `cloudfunctions/book/index.js` - Added points check and deduction

### 7. Testing Status
- ✅ Unit tests: 200+ tests passing
- ✅ Core service tests all pass (pointsService, orderService)
- ⏳ Manual testing pending

### 8. Deployment Checklist
- [ ] Deploy `cloudfunctions/points` (fixed _.inc() bug)
- [ ] Deploy `cloudfunctions/publish` (fixed _.inc() bug)
- [ ] Deploy `cloudfunctions/book` (if needed)
- [ ] Test: Login → Get 1000 initial points
- [ ] Test: Publish parking spot → Get +50 points
- [ ] Test: Book parking spot → Spend 10 points
- [ ] Test: Daily check-in → Get +10 points
- [ ] Test: Consecutive 7-day check-in → Get +100 bonus

### 9. Common Pitfalls

1. **Using `_.add()` instead of `_.inc()`** - Always use `_.inc(value)` for field increments
2. **Using `.doc(id).get()` for existence check** - Use `.where({ _id: id }).get()` instead
3. **Forgetting to redeploy cloud functions** - Changes require "上传并部署：云端安装依赖"
4. **Inconsistent naming between database fields** - Database uses `snake_case`, frontend uses `camelCase`

### 10. Git Status Reference
```
M miniprogram/app.json
M miniprogram/components/plate-input/*
M miniprogram/pages/book/*
M miniprogram/pages/home/*
M miniprogram/pages/profile/*
M miniprogram/pages/publish/*
M miniprogram/services/orderService.js
M miniprogram/services/parkingService.js
```
