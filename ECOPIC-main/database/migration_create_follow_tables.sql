-- Migration: Create user_follows and tag_follows tables
-- Run this in your PostgreSQL database to add support for user and tag following

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Create indexes for user_follows
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

-- Create indexes for tag_follows
CREATE INDEX IF NOT EXISTS idx_tag_follows_user ON tag_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_follows_tag ON tag_follows(tag);

-- Verify tables were created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_follows', 'tag_follows')
ORDER BY tablename;
