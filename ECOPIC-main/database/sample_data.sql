-- Sample Data for ReLeaf Application
-- Run this after schema.sql to populate with test data

-- Insert sample users
INSERT INTO users (id, username, email, password_hash, bio, carbon_credits) VALUES 
(uuid_generate_v4(), 'ecowarrior123', 'eco@example.com', '$2b$10$example.hash.here', 'Passionate about environmental conservation and sustainable living', 1500),
(uuid_generate_v4(), 'treelover', 'trees@example.com', '$2b$10$example.hash.here', 'Love planting trees and growing gardens', 2300),
(uuid_generate_v4(), 'greenthumb', 'green@example.com', '$2b$10$example.hash.here', 'Organic gardener and composting enthusiast', 890),
(uuid_generate_v4(), 'sustainableliving', 'sustain@example.com', '$2b$10$example.hash.here', 'Living zero waste and inspiring others to do the same', 3200);

-- Store user IDs for reference in posts
-- Note: In a real scenario, you'd use the actual UUIDs returned from the above inserts

-- Insert sample posts (using subqueries to get user IDs)
INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/tree_planting_1.jpg',
    'Planted 10 oak trees in the local park today with the community group. Each tree will absorb about 48 pounds of CO2 per year!',
    ARRAY['tree-planting', 'community', 'oak-trees'],
    320,
    'PUBLISHED'
FROM users u WHERE u.username = 'ecowarrior123';

INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/beach_cleanup.jpg',
    'Beach cleanup day! Removed 15 pounds of plastic waste from our local beach. Every piece counts!',
    ARRAY['cleanup', 'plastic-reduction', 'beach'],
    275,
    'PUBLISHED'
FROM users u WHERE u.username = 'treelover';

INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/composting.jpg',
    'Started a community composting program at my apartment complex. Teaching neighbors how to reduce food waste.',
    ARRAY['composting', 'community', 'waste-reduction'],
    190,
    'PUBLISHED'
FROM users u WHERE u.username = 'greenthumb';

INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/solar_panels.jpg',
    'Installed solar panels on my home! Now generating 100% renewable energy. Excess power goes back to the grid.',
    ARRAY['renewable-energy', 'solar', 'home-improvement'],
    450,
    'PUBLISHED'
FROM users u WHERE u.username = 'sustainableliving';

INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/urban_garden.jpg',
    'Built a vertical garden on my balcony! Growing herbs, lettuce, and tomatoes in small space.',
    ARRAY['urban-gardening', 'food-production', 'vertical-garden'],
    225,
    'PUBLISHED'
FROM users u WHERE u.username = 'greenthumb';

INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/bike_commute.jpg',
    'Week 52 of biking to work instead of driving! Saved approximately 2,400 miles of car travel this year.',
    ARRAY['transportation', 'biking', 'carbon-reduction'],
    380,
    'PUBLISHED'
FROM users u WHERE u.username = 'treelover';

-- Insert some pending posts to show the workflow
INSERT INTO posts (user_id, image_url, description, tags, points, status) 
SELECT 
    u.id,
    'https://example.com/images/river_cleanup.jpg',
    'Organized a river cleanup event this weekend. Expecting 50+ volunteers!',
    ARRAY['cleanup', 'community', 'water-conservation'],
    0,
    'PENDING_POINTS'
FROM users u WHERE u.username = 'ecowarrior123';

-- Insert some sample redemptions
INSERT INTO redemptions (user_id, points_spent, reward_item, reward_description)
SELECT 
    u.id,
    500,
    'Tree Sapling Kit',
    'Plant your own tree with this starter kit including seeds, soil, and planting guide'
FROM users u WHERE u.username = 'treelover';

INSERT INTO redemptions (user_id, points_spent, reward_item, reward_description)
SELECT 
    u.id,
    300,
    'Eco-Friendly Water Bottle',
    'Reusable stainless steel water bottle with insulation'
FROM users u WHERE u.username = 'greenthumb';

INSERT INTO redemptions (user_id, points_spent, reward_item, reward_description)
SELECT 
    u.id,
    200,
    'Organic Seed Pack',
    'Variety pack of organic vegetable seeds for home gardening'
FROM users u WHERE u.username = 'ecowarrior123';

-- Update user carbon_credits to reflect their earned points minus redemptions
UPDATE users SET carbon_credits = (
    SELECT COALESCE(SUM(p.points), 0) - COALESCE(SUM(r.points_spent), 0)
    FROM users u2 
    LEFT JOIN posts p ON u2.id = p.user_id AND p.status = 'PUBLISHED'
    LEFT JOIN redemptions r ON u2.id = r.user_id
    WHERE u2.id = users.id
    GROUP BY u2.id
);

-- Add some more sample rewards for testing
INSERT INTO rewards (name, description, points_required, quantity, is_active) VALUES
('Reusable Produce Bags', 'Set of 5 mesh bags for plastic-free grocery shopping', 100, 500, TRUE),
('Energy Efficient LED Bulb Pack', 'Pack of 4 LED bulbs that use 80% less energy', 180, 300, TRUE),
('Beeswax Food Wraps', 'Reusable alternative to plastic wrap, set of 3 sizes', 120, 200, TRUE),
('Rain Water Collection Kit', 'Collect rainwater for garden irrigation', 600, 30, TRUE),
('Carbon Footprint Audit', 'Professional analysis of your home energy usage', 1000, 20, TRUE);

-- Create some additional test data with various tag combinations
INSERT INTO posts (user_id, image_url, description, tags, points, status) VALUES
((SELECT id FROM users WHERE username = 'sustainableliving'), 
 'https://example.com/images/zero_waste.jpg',
 'Achieved zero waste for an entire month! All organic waste composted, everything else reused or recycled.',
 ARRAY['zero-waste', 'composting', 'recycling'],
 425, 'PUBLISHED'),

((SELECT id FROM users WHERE username = 'ecowarrior123'), 
 'https://example.com/images/native_plants.jpg',
 'Replaced my lawn with native wildflowers. Better for local wildlife and requires no watering!',
 ARRAY['native-plants', 'water-conservation', 'wildlife'],
 350, 'PUBLISHED'),

((SELECT id FROM users WHERE username = 'treelover'), 
 'https://example.com/images/electric_car.jpg',
 'Switched to electric vehicle! No more gas emissions from my daily commute.',
 ARRAY['transportation', 'electric-vehicle', 'emissions'],
 500, 'PUBLISHED');