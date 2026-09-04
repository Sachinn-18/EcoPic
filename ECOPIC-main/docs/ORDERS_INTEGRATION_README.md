# ReLeaf Orders & Processing System - Integration Guide

## Overview

The ReLeaf redemption system is designed to be modular and integrate with an external order processing site. This document outlines how redemption data flows from the main app to the order processing system.

## Current Architecture

### Redemption Flow

```
ReLeaf Frontend (Redeem Page)
    ↓
Backend API (/api/rewards/redeem)
    ↓
Database (users, rewards, redemptions tables)
    ↓
[Order Processing Site - To be created]
    ↓
Fulfillment & Shipping
```

## API Endpoints

### 1. Get Available Rewards
```
GET /api/rewards

Response:
[
  {
    "id": "uuid",
    "name": "Tree Sapling Kit",
    "description": "Plant your own tree...",
    "points_required": 500,
    "quantity_available": 100 | "unlimited",
    "image_url": "https://...",
    "is_active": true
  },
  ...
]
```

### 2. Process Redemption (Checkout)
```
POST /api/rewards/redeem
Authorization: Bearer <token>

Request Body:
{
  "items": [
    {
      "reward_id": "uuid",
      "quantity": 2
    },
    {
      "reward_id": "uuid",
      "quantity": 1
    }
  ]
}

Response:
{
  "message": "Redemption successful",
  "redemption_ids": ["uuid", "uuid"],
  "items_redeemed": [
    {
      "reward_id": "uuid",
      "reward_name": "Tree Sapling Kit",
      "quantity": 2,
      "points_per_item": 500,
      "total_points": 1000
    }
  ],
  "total_points_spent": 1000,
  "remaining_credits": 5234,
  "order_status": "processing"
}
```

## Database Schema

### Redemptions Table
```sql
CREATE TABLE redemptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    points_spent INTEGER NOT NULL,
    reward_item VARCHAR(200) NOT NULL,
    reward_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### Data Available for Export (Commented Out)

The following endpoints are prepared but commented out for future integration with the order processing site:

#### Get User Redemption History
```
GET /api/rewards/history
Authorization: Bearer <token>

Returns all redemptions for the authenticated user
- Order dates
- Points spent
- Items ordered
- Descriptions
```

#### Get All Redemptions (Admin)
```
GET /api/rewards/admin/all
Authorization: Bearer <token>

Returns all user redemptions (requires admin role check)
- User details (id, username, email)
- Order details (items, points)
- Created timestamps
```

## Order Processing System Requirements

The external order processing site should:

1. **Fetch Orders**: Retrieve redemption data via the API or database connection
2. **Process Orders**: Handle:
   - Inventory management
   - Shipping address collection
   - Fulfillment tracking
   - Delivery confirmation
3. **Update Status**: Maintain order status in a separate tracking table
4. **Handle Returns**: Process refunds/exchanges if needed

## Integration Steps

### Step 1: Create Order Processing Site
```
Create a new application (e.g., Node.js, Python, etc.)
- Domain: orders.releaf.com or similar
- Database: Connected to ReLeaf database (read access to redemptions table)
```

### Step 2: Enable Commented Endpoints
Uncomment the following in `backend/src/routes/rewards.ts`:
- `GET /api/rewards/history` - User's order history
- `GET /api/rewards/admin/all` - Admin view of all orders
- `exportRedemptionData()` - Data export utility

### Step 3: Implement Order Tracking
```
Create table: orders_tracking
- redemption_id (FK to redemptions.id)
- status (pending, processing, shipped, delivered)
- tracking_number
- shipping_address
- estimated_delivery
- updated_at
```

### Step 4: API Integration
```typescript
// Example integration in order processing site
const redemptions = await fetch('https://api.releaf.com/api/rewards/history', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
})

// Process each redemption
// Update order tracking table
// Send shipping notifications
```

## Database Connection

Order processing system can connect to ReLeaf database:

```env
DATABASE_URL=postgresql://user:password@host:5432/releaf_db

# Read-only user recommended for security
CREATE USER order_processor WITH PASSWORD 'secure_password';
GRANT SELECT ON redemptions TO order_processor;
GRANT SELECT ON users TO order_processor;
GRANT SELECT, UPDATE ON orders_tracking TO order_processor;
```

## Current Frontend Implementation

The ReLeaf Redeem Page (`frontend/src/pages/RedeemPage.tsx`) includes:

### Shopping Cart Features
- ✅ Add/remove items from cart
- ✅ Adjust quantities
- ✅ View total points
- ✅ Real-time credit verification
- ✅ One-click checkout

### Checkout Process
```
1. User adds items to cart
2. User clicks "Buy Now"
3. Backend processes redemption
4. Credits deducted from user account
5. Redemption record created
6. Response includes order status "processing"
7. User redirected to profile page
```

## API Response Codes

- `200 OK` - Rewards retrieved successfully
- `201 Created` - Redemption successful
- `400 Bad Request` - Invalid input or insufficient credits
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Reward not found
- `500 Internal Server Error` - Database or server error

## Security Considerations

1. **Authentication**: All POST requests require valid JWT token
2. **Authorization**: User can only redeem with their own credits
3. **Transactions**: Database transactions ensure atomicity
4. **Rate Limiting**: Apply rate limits to prevent abuse
5. **Validation**: Input validation on all user submissions

## Future Enhancements

- [ ] Order tracking dashboard
- [ ] Email notifications on order status
- [ ] Refund/exchange system
- [ ] Bulk order exports
- [ ] Analytics dashboard
- [ ] Abandoned cart recovery
- [ ] Wishlist functionality
- [ ] Subscription rewards

## Testing

### Test Redemption Endpoint
```bash
curl -X POST http://localhost:3001/api/rewards/redeem \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "reward_id": "<uuid>",
        "quantity": 1
      }
    ]
  }'
```

### Test Points Deduction
```bash
# Check user credits before
GET /api/users/:userId

# Perform redemption
POST /api/rewards/redeem

# Check user credits after (should be reduced)
GET /api/users/:userId
```

## Notes

- Commented code sections are marked with `// commented out - to be exported to order processing site`
- Look for `/*` and `*/` comment blocks in `backend/src/routes/rewards.ts`
- Uncomment when integrating with external order processing system
- All redemption records are preserved in database for auditing

## Contact & Support

For questions about integration, contact the development team or refer to the main README.md file.
