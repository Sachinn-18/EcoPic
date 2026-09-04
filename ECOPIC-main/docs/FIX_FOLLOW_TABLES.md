# Fix Follow Tables Issue

## Problem
The `user_follows` and `tag_follows` tables don't exist in the database, causing 500 errors when trying to follow users/tags.

## Solution

### Option 1: Quick Fix (Recommended for Development)

Run the migration script directly on the running database:

```bash
# Access the database container
docker exec -it releaf-postgres psql -U releaf_user -d releaf_db -f /docker-entrypoint-initdb.d/add_follow_tables.sql
```

Or manually create the tables:

```bash
docker exec -it releaf-postgres psql -U releaf_user -d releaf_db << EOF

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Create tag_follows table
CREATE TABLE IF NOT EXISTS tag_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tag_follows_user ON tag_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_follows_tag ON tag_follows(tag);

-- Verify
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_follows', 'tag_follows');

EOF
```

### Option 2: Full Database Reset (Removes all data)

```bash
# Stop Docker services
docker-compose down

# Remove volume to reset database
docker volume rm releaf-app_postgres_data

# Restart services (will recreate database from schema.sql)
docker-compose up -d
```

### Option 3: Check if Tables Exist

Run this to verify:

```bash
docker exec -it releaf-postgres psql -U releaf_user -d releaf_db << EOF
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
EOF
```

Should output tables including:
- `user_follows`
- `tag_follows`

## Verification

After running the migration, verify the tables were created:

```bash
docker exec -it releaf-postgres psql -U releaf_user -d releaf_db -c "\dt"
```

You should see both `user_follows` and `tag_follows` in the output.

## Testing

After tables are created:

1. Refresh the browser
2. Try following a tag - should get 201 success response
3. Try unfollowing a tag - should work
4. Check navbar - should update correctly

## If Still Getting 500 Errors

1. Check backend logs:
   ```bash
   docker-compose logs backend
   ```
   Look for the specific error message

2. Verify backend can connect to database:
   ```bash
   docker exec -it releaf-backend npm run build && npm start
   ```

3. If it's a different error, check:
   - Database connection URL is correct
   - `user_id` being passed is a valid UUID
   - User exists in the database

## Notes

- The `schema.sql` file has been updated with these tables
- For fresh installations, tables will be created automatically
- Existing databases need manual migration using this guide
- All data is preserved when adding new tables
