# Quick Start - Dynamic Redemption System

## Testing the Redeem System Locally

### Prerequisites
- Docker Compose running with all services
- User logged in (with some carbon credits)

### Start Services
```bash
cd /path/to/releaf-app
docker-compose up -d
```

### Test Flow

#### 1. Access Redeem Page
```
Browser: http://localhost:5173/redeem
```

#### 2. View Products
You should see 6 eco-friendly products:
- Tree Sapling Kit (500 credits)
- Eco-Friendly Water Bottle (300 credits)
- Solar Phone Charger (800 credits)
- Organic Seed Pack (200 credits)
- Bamboo Utensil Set (150 credits)
- LED Bike Light Set (250 credits)

#### 3. Add to Cart
- Click "Add to Cart" on any product
- See toast notification "Added X to cart"
- Cart badge updates with count
- Add multiple items to test multi-item checkout

#### 4. Open Cart
- Click "Cart" button (top right)
- See all items with prices
- See total points needed
- See credit balance and verification

#### 5. Modify Cart
- Click +/- to change quantities
- Click trash icon to remove items
- Cart total updates in real-time

#### 6. Checkout
- Click "Buy Now"
- Wait for processing (shows "Processing...")
- See success notification
- Credits updated and page redirects to profile

#### 7. Verify Redemption
- Check profile page for updated credits
- Credits should be reduced by purchase amount
- Check database for redemption records

### API Testing with cURL

#### Get All Products
```bash
curl http://localhost:3001/api/rewards
```

#### Checkout (Requires Auth Token)
```bash
curl -X POST http://localhost:3001/api/rewards/redeem \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "reward_id": "<product-uuid>",
        "quantity": 2
      }
    ]
  }'
```

### Database Verification

```bash
# Connect to database
docker exec -it releaf-postgres psql -U releaf_user -d releaf_db

# View available rewards
SELECT id, name, points_required, quantity FROM rewards WHERE is_active = TRUE;

# View redemptions
SELECT id, user_id, points_spent, reward_item, created_at FROM redemptions ORDER BY created_at DESC LIMIT 5;

# Check user credits
SELECT id, username, carbon_credits FROM users WHERE username = 'YOUR_USERNAME';
```

## Code Locations

### Frontend
- **Page**: `frontend/src/pages/RedeemPage.tsx`
- **API**: `frontend/src/api/client.ts` (rewardsAPI)
- **Route**: App.tsx - `/redeem`

### Backend
- **Route Handler**: `backend/src/routes/rewards.ts`
- **Server Config**: `backend/src/server.ts` (imports rewards route)
- **Database**: `database/schema.sql` (rewards table)

### Documentation
- **Full Details**: `REDEEM_SYSTEM_SUMMARY.md`
- **Integration**: `ORDERS_INTEGRATION_README.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

## Common Issues & Solutions

### Products Not Loading
**Problem**: Blank product grid
**Solution**: 
- Check if backend is running: `docker-compose ps`
- Check browser console for errors
- Verify /api/rewards endpoint works: `curl http://localhost:3001/api/rewards`

### Cart Button Disabled
**Problem**: Can't add to cart
**Solution**: 
- Check user credits: `curl http://localhost:3001/api/users/{user_id}`
- Ensure credits >= product points
- Login with a test user that has credits

### Checkout Fails
**Problem**: Error when clicking "Buy Now"
**Solution**:
- Check network tab for API errors
- Verify authentication token is valid
- Check backend logs: `docker-compose logs backend`
- Ensure sufficient credits

### Credits Not Updated
**Problem**: Credits same after checkout
**Solution**:
- Refresh page (may not be live-updated)
- Check user profile page
- Verify in database: `SELECT carbon_credits FROM users WHERE id = 'user_id'`
- Check redemption record created: `SELECT * FROM redemptions WHERE user_id = 'user_id' ORDER BY created_at DESC LIMIT 1`

## Development Tips

### Add More Products
Edit `database/schema.sql` and update the INSERT statement or add to rewards table:

```sql
INSERT INTO rewards (name, description, points_required, quantity, is_active) 
VALUES ('Product Name', 'Description', 100, 50, TRUE);
```

### Modify Product Details
Update rewards in database:
```sql
UPDATE rewards SET points_required = 350 WHERE name = 'Eco-Friendly Water Bottle';
```

### Clear Redemitions (Testing)
```sql
DELETE FROM redemptions;
```

### Reset User Credits (Testing)
```sql
UPDATE users SET carbon_credits = 10000 WHERE username = 'test_user';
```

## Features Checklist

- ✅ Dynamic product catalog from database
- ✅ Shopping cart with add/remove/quantity
- ✅ Real-time total calculation
- ✅ Credit verification
- ✅ Sticky cart sidebar
- ✅ Atomic checkout with transaction
- ✅ Credit deduction on purchase
- ✅ Redemption record creation
- ✅ Inventory tracking
- ✅ Error handling
- ✅ Toast notifications
- ✅ Loading states
- ✅ Responsive design
- ✅ Commented code for order processing

## Next Steps

1. **Test thoroughly** - Use checklist in REDEEM_SYSTEM_SUMMARY.md
2. **Add more products** - Update database rewards table
3. **Integrate order processing** - See ORDERS_INTEGRATION_README.md
4. **Add product images** - Set image_url in rewards table
5. **Setup email notifications** - For order confirmations

## Performance Notes

- Products cached on first load
- Cart stored locally (no API calls for each change)
- Checkout debounced (prevents double-submit)
- Database transaction ensures consistency
- Indexes on frequently queried fields

## Security Checklist

- ✅ JWT authentication required for checkout
- ✅ User can only spend own credits
- ✅ Input validation on cart items
- ✅ Database transaction prevents race conditions
- ✅ Account locked during transaction
- ✅ Comprehensive error handling
- ✅ No sensitive data in responses
- ✅ Rate limiting on API

## Support

For detailed information:
- See `REDEEM_SYSTEM_SUMMARY.md` for full implementation details
- See `ORDERS_INTEGRATION_README.md` for order processing setup
- See `backend/src/routes/rewards.ts` for API code
- See `frontend/src/pages/RedeemPage.tsx` for frontend code
