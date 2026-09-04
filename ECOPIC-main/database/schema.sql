-- ReLeaf Database Schema
-- PostgreSQL implementation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    carbon_credits BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username and email for faster lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    description TEXT,
    tags TEXT[], -- PostgreSQL array for tags
    points INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING_POINTS' CHECK (status IN ('PENDING_POINTS', 'PUBLISHED', 'PENDING_RETRY', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags); -- GIN index for array queries

-- Redemptions table
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL CHECK (points_spent > 0),
    reward_item VARCHAR(200) NOT NULL,
    reward_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and created_at for user redemption history
CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_redemptions_created_at ON redemptions(created_at DESC);

-- Refresh tokens table for JWT authentication
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Rewards catalog table (for available rewards)
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL CHECK (points_required > 0),
    quantity INTEGER DEFAULT -1, -- -1 means unlimited
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rewards_active ON rewards(is_active);
CREATE INDEX idx_rewards_points ON rewards(points_required);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample rewards
INSERT INTO rewards (name, description, points_required, quantity, is_active) VALUES
('Tree Sapling Kit', 'Plant your own tree with this starter kit including seeds, soil, and planting guide', 500, 100, TRUE),
('Eco-Friendly Water Bottle', 'Reusable stainless steel water bottle with insulation', 300, 50, TRUE),
('Solar Phone Charger', 'Portable solar charger compatible with most smartphones', 800, 25, TRUE),
('Organic Seed Pack', 'Variety pack of organic vegetable seeds for home gardening', 200, 200, TRUE),
('Bamboo Utensil Set', 'Reusable bamboo utensils in a carrying case', 150, 150, TRUE),
('LED Bike Light Set', 'Front and rear LED lights for safer cycling', 250, 75, TRUE);

-- Create a view for user statistics
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.carbon_credits,
    COUNT(p.id) as total_posts,
    COALESCE(SUM(p.points), 0) as total_points_earned,
    COALESCE(SUM(r.points_spent), 0) as total_points_spent
FROM users u
LEFT JOIN posts p ON u.id = p.user_id AND p.status = 'PUBLISHED'
LEFT JOIN redemptions r ON u.id = r.user_id
GROUP BY u.id, u.username, u.carbon_credits;

-- User follows table (for following other users)
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- Tag follows table (for following specific tags)
CREATE TABLE tag_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tag)
);

CREATE INDEX idx_tag_follows_user ON tag_follows(user_id);
CREATE INDEX idx_tag_follows_tag ON tag_follows(tag);

-- Create a function to safely decrement user credits during redemption
CREATE OR REPLACE FUNCTION redeem_reward(
    p_user_id UUID,
    p_reward_id UUID,
    p_points_required INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_credits BIGINT;
    reward_quantity INTEGER;
BEGIN
    -- Start transaction
    -- Check user credits
    SELECT carbon_credits INTO current_credits FROM users WHERE id = p_user_id FOR UPDATE;
    
    IF current_credits IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF current_credits < p_points_required THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;
    
    -- Check reward availability (if quantity is limited)
    SELECT quantity INTO reward_quantity FROM rewards WHERE id = p_reward_id AND is_active = TRUE;
    
    IF reward_quantity IS NULL THEN
        RAISE EXCEPTION 'Reward not found or inactive';
    END IF;
    
    IF reward_quantity = 0 THEN
        RAISE EXCEPTION 'Reward out of stock';
    END IF;
    
    -- Deduct credits from user
    UPDATE users SET carbon_credits = carbon_credits - p_points_required WHERE id = p_user_id;
    
    -- Decrement reward quantity (if not unlimited)
    IF reward_quantity > 0 THEN
        UPDATE rewards SET quantity = quantity - 1 WHERE id = p_reward_id;
    END IF;
    
    -- Record redemption
    INSERT INTO redemptions (user_id, points_spent, reward_item, reward_description)
    SELECT p_user_id, p_points_required, r.name, r.description
    FROM rewards r WHERE r.id = p_reward_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;