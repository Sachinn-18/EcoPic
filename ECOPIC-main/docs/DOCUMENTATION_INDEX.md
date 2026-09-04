# ReLeaf Documentation Index

Welcome to ReLeaf! This index helps you navigate all documentation files. Start here to find what you need.

## Quick Navigation

### 🚀 Getting Started
- **[QUICK_START_REDEEM.md](./QUICK_START_REDEEM.md)** - Test the shopping cart locally (5 min read)
- **[README.md](./README.md)** - Project overview and setup instructions

### 📚 Core Documentation

#### Personalized Feed & Discovery (Latest Features)
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Overview of personalized feed and discovery features
  - User-to-user following
  - Tag following system
  - Personalized homepage
  - Advanced filtering & search

#### Dynamic Shopping System
- **[REDEEM_SYSTEM_SUMMARY.md](./REDEEM_SYSTEM_SUMMARY.md)** - Complete technical guide (18 min read)
  - Backend API architecture
  - Frontend component details
  - User experience flow
  - Security features
  - Testing checklist
  
- **[ORDERS_INTEGRATION_README.md](./ORDERS_INTEGRATION_README.md)** - Order processing integration (10 min read)
  - External order processing setup
  - API endpoint documentation
  - Database schema
  - Integration steps
  - Code examples

#### Project Overview
- **[WARP.md](./WARP.md)** - Development commands and workflows
  - Docker commands
  - Frontend/Backend development
  - Testing procedures
  - Architecture diagrams

### ✅ Implementation Status
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Final implementation checklist
  - What was delivered
  - Technical specifications
  - Testing coverage
  - Deployment status

## Documentation by Task

### "I want to..."

#### ...test the shopping cart
→ Read [QUICK_START_REDEEM.md](./QUICK_START_REDEEM.md)
- Step-by-step testing
- Common issues & fixes
- Database verification

#### ...understand the architecture
→ Read [REDEEM_SYSTEM_SUMMARY.md](./REDEEM_SYSTEM_SUMMARY.md)
- Technical design
- Database integration
- Security measures

#### ...set up order processing
→ Read [ORDERS_INTEGRATION_README.md](./ORDERS_INTEGRATION_README.md)
- Integration guide
- API requirements
- Database connection

#### ...find a specific feature
→ Use the index below or Ctrl+F

#### ...get started with development
→ Read [WARP.md](./WARP.md)
- Development commands
- Project structure
- Build/test procedures

## File Structure

```
releaf-app/
├── README.md                        # Main project README
├── WARP.md                          # Development guide for Warp
├── ISSUE.MD                         # Known issues
│
├── Documentation/
├── IMPLEMENTATION_SUMMARY.md        # Personalized feed implementation
├── IMPLEMENTATION_COMPLETE.md       # Dynamic system completion status
├── REDEEM_SYSTEM_SUMMARY.md        # Shopping cart technical details
├── ORDERS_INTEGRATION_README.md    # Order processing integration
├── QUICK_START_REDEEM.md           # Quick testing guide
├── DOCUMENTATION_INDEX.md          # This file
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # Personalized feed
│   │   │   ├── DiscoverFeedPage.tsx # Discovery with filters
│   │   │   └── RedeemPage.tsx      # Shopping cart
│   │   ├── components/
│   │   │   └── Navbar.tsx          # Navigation
│   │   └── api/
│   │       └── client.ts           # API integration
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts             # Authentication
│   │   │   ├── users.ts            # Users & following
│   │   │   ├── posts.ts            # Posts & personalized feed
│   │   │   └── rewards.ts          # NEW: Shopping & redemption
│   │   └── server.ts               # Main server config
│   └── package.json
│
├── database/
│   └── schema.sql                  # Database schema
│
└── docker-compose.yml              # Docker configuration
```

## Key Features Documentation

### 1. Personalized Feed (Latest)
**Files**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **HomePage** (`/`) - Shows posts from followed users and tags
- **DiscoverFeedPage** (`/feed`) - Browse all posts with filters
- **Features**:
  - Follow/unfollow users
  - Follow/unfollow tags
  - Multi-tag filtering
  - Username search
  - Sort by recent/popular

**Backend**: `backend/src/routes/users.ts`, `backend/src/routes/posts.ts`
**Frontend**: `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/DiscoverFeedPage.tsx`

### 2. Dynamic Shopping Cart
**Files**: [REDEEM_SYSTEM_SUMMARY.md](./REDEEM_SYSTEM_SUMMARY.md), [QUICK_START_REDEEM.md](./QUICK_START_REDEEM.md)
- **RedeemPage** (`/redeem`) - Browse and purchase products
- **Features**:
  - Browse 6 eco-friendly products
  - Add to cart with quantities
  - Real-time calculations
  - Credit verification
  - Atomic checkout
  - Inventory tracking

**Backend**: `backend/src/routes/rewards.ts`
**Frontend**: `frontend/src/pages/RedeemPage.tsx`

### 3. Order Processing Integration
**Files**: [ORDERS_INTEGRATION_README.md](./ORDERS_INTEGRATION_README.md)
- External order processing system integration
- Commented code ready to uncomment
- API endpoints for order data export
- Database schema for order tracking

**Backend Commented Code**: `backend/src/routes/rewards.ts` (lines 216-285)
**Frontend Commented Code**: `frontend/src/api/client.ts` (lines 201-212)

## Database Tables Referenced

- **users** - User accounts with carbon_credits
- **rewards** - Product catalog (6 items pre-loaded)
- **redemptions** - Purchase history
- **posts** - User posts
- **user_follows** - User-to-user follows
- **tag_follows** - User tag follows

## API Endpoints Summary

### Users & Following
```
POST   /api/users/:id/follow          # Follow user
DELETE /api/users/:id/follow          # Unfollow user
GET    /api/users/:id/followers       # Get followers list
GET    /api/users/:id/following       # Get following list
POST   /api/users/tags/follow         # Follow tag
DELETE /api/users/tags/follow         # Unfollow tag
GET    /api/users/:id/followed-tags   # Get followed tags
```

### Posts & Feed
```
GET /api/posts/home/feed              # Personalized feed
GET /api/posts                         # All posts (with filters)
GET /api/posts/:id                     # Single post
POST /api/posts                        # Create post
DELETE /api/posts/:id                  # Delete post
```

### Rewards & Shopping
```
GET    /api/rewards                    # List products
GET    /api/rewards/:id                # Single product
POST   /api/rewards/redeem             # Checkout
```

## Documentation Statistics

| Document | Type | Lines | Purpose |
|----------|------|-------|---------|
| IMPLEMENTATION_SUMMARY.md | Technical | 177 | Feature overview |
| IMPLEMENTATION_COMPLETE.md | Status | 343 | Completion checklist |
| REDEEM_SYSTEM_SUMMARY.md | Technical | 406 | Shopping system details |
| ORDERS_INTEGRATION_README.md | Integration | 276 | Order processing guide |
| QUICK_START_REDEEM.md | Guide | 222 | Quick testing reference |
| WARP.md | Developer | 195 | Dev commands |
| README.md | General | 325 | Project overview |

**Total Documentation: ~1900 lines**

## Getting Help

### Common Questions

**Q: How do I start the app?**
A: See [WARP.md](./WARP.md) - Docker Compose section

**Q: How do I test the shopping cart?**
A: See [QUICK_START_REDEEM.md](./QUICK_START_REDEEM.md) - Test Flow section

**Q: What's the checkout process?**
A: See [REDEEM_SYSTEM_SUMMARY.md](./REDEEM_SYSTEM_SUMMARY.md) - User Experience Flow section

**Q: How do I integrate the order processing system?**
A: See [ORDERS_INTEGRATION_README.md](./ORDERS_INTEGRATION_README.md) - Integration Steps section

**Q: What database tables are used?**
A: See [database/schema.sql](./database/schema.sql) or any README

**Q: How do I follow users and tags?**
A: See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - User Workflows section

## Code Examples

### Add Product to Cart (Frontend)
```typescript
const addToCart = (reward: Reward) => {
  setCart(prevCart => {
    const existingItem = prevCart.find(item => item.reward.id === reward.id)
    if (existingItem) {
      return prevCart.map(item =>
        item.reward.id === reward.id
          ? { ...item, quantity: item.quantity + 1, ... }
          : item
      )
    }
    return [...prevCart, { reward, quantity: 1, ... }]
  })
}
```
See [frontend/src/pages/RedeemPage.tsx](./frontend/src/pages/RedeemPage.tsx)

### Process Redemption (Backend)
```typescript
router.post('/redeem', authenticateToken, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Lock user account
    // Verify credits
    // Deduct points
    // Create records
    // Update inventory
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
  }
})
```
See [backend/src/routes/rewards.ts](./backend/src/routes/rewards.ts)

## Recent Updates

### Version 1.2 - Dynamic Redemption System ✅
- Implemented shopping cart with real-time calculations
- Added atomic transaction processing
- Inventory tracking system
- Comprehensive error handling
- Complete documentation (4 files)

### Version 1.1 - Personalized Feed & Discovery ✅
- Added user following system
- Implemented tag following
- Created personalized homepage
- Enhanced feed with advanced filters
- Implemented sorting and search

## Quick Reference

### File Locations
- Frontend components: `frontend/src/pages/` and `frontend/src/components/`
- Backend routes: `backend/src/routes/`
- Database schema: `database/schema.sql`
- API client: `frontend/src/api/client.ts`

### Commands
- Start dev: `docker-compose up -d`
- View logs: `docker-compose logs [service]`
- Connect to DB: `docker exec -it releaf-postgres psql -U releaf_user -d releaf_db`
- Test frontend: `http://localhost:5173`
- Test backend: `http://localhost:3001/health`

### Important Notes
- All endpoints documented in each README
- Commented code for future integration clearly marked
- Database transactions ensure data integrity
- JWT authentication required for protected endpoints
- Rate limiting on all API endpoints

---

**Last Updated**: October 29, 2025
**Documentation Version**: 1.0
**Project Version**: 1.2

For the latest information, always refer to the specific feature documentation files listed above.
