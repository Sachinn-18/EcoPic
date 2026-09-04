import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

let isPgConnected = false
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://releaf_user:releaf_password@localhost:5432/releaf_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 2000,
})

// In-Memory Fallback Database
const mockData = {
  users: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'eco_warrior',
      email: 'eco@example.com',
      password_hash: '$2b$12$W91fO209hG6o0hYQfO209e.k8f/J/4X80uG1u8F3/6G0z0j.k8f/J', // dummy
      bio: 'Passionate about planting trees and zero waste!',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      carbon_credits: 450,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  posts: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      user_id: '11111111-1111-1111-1111-111111111111',
      image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800',
      description: 'Planted 5 native trees in the local community park today! #treeplanting #greenearth',
      tags: ['tree-planting', 'greenearth', 'ecoaction'],
      points: 120,
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      user_id: '11111111-1111-1111-1111-111111111111',
      image_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800',
      description: 'Cleaned up plastic waste at the beach. Every bit helps save ocean life! #beachcleanup #zerowaste',
      tags: ['cleanup', 'zero-waste', 'oceanlove'],
      points: 200,
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    }
  ],
  rewards: [
    { id: 'r1', name: 'Tree Sapling Kit', description: 'Plant your own tree with starter seeds', points_required: 500, quantity: 100, is_active: true },
    { id: 'r2', name: 'Eco-Friendly Water Bottle', description: 'Stainless steel insulated bottle', points_required: 300, quantity: 50, is_active: true },
    { id: 'r3', name: 'Solar Phone Charger', description: 'Portable solar charger', points_required: 800, quantity: 25, is_active: true },
    { id: 'r4', name: 'Organic Seed Pack', description: 'Variety of vegetable seeds', points_required: 200, quantity: 200, is_active: true },
    { id: 'r5', name: 'Bamboo Utensil Set', description: 'Reusable bamboo utensils', points_required: 150, quantity: 150, is_active: true },
    { id: 'r6', name: 'LED Bike Light Set', description: 'Front and rear LED lights', points_required: 250, quantity: 75, is_active: true }
  ],
  refresh_tokens: [] as any[],
  redemptions: [] as any[],
  user_follows: [] as { id: string; follower_id: string; following_id: string; created_at: string }[],
  tag_follows: [] as { id: string; user_id: string; tag: string; created_at: string }[]
}

// Test PostgreSQL connection
pgPool.connect((err, client, release) => {
  if (err) {
    console.warn('⚠️ PostgreSQL connection failed:', err.message)
    console.warn('⚡ Using In-Memory Fallback Database for Development')
    isPgConnected = false
  } else {
    console.log('📊 Connected to PostgreSQL database')
    isPgConnected = true
    if (release) release()
  }
})

pgPool.on('error', (err) => {
  console.warn('⚠️ PostgreSQL error encountered:', err.message)
  isPgConnected = false
})

async function executeMockQuery(text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  const sql = text.trim().toLowerCase()

  // -----------------------------------------------------------
  // 1. TAG FOLLOWS
  // -----------------------------------------------------------
  if (sql.includes('from tag_follows') || sql.includes('into tag_follows') || sql.includes('tag_follows where')) {
    // SELECT tag FROM tag_follows WHERE user_id = $1
    if (sql.startsWith('select tag from tag_follows') || sql.includes('select tag from tag_follows')) {
      const userId = params[0]
      const userTags = mockData.tag_follows
        .filter(tf => tf.user_id === userId)
        .map(tf => ({ tag: tf.tag }))
      return { rows: userTags, rowCount: userTags.length }
    }

    // SELECT id FROM tag_follows WHERE user_id = $1 AND tag = $2
    if (sql.includes('select id from tag_follows')) {
      const userId = params[0]
      const tag = params[1]
      const existing = mockData.tag_follows.find(tf => tf.user_id === userId && tf.tag.toLowerCase() === tag?.toLowerCase())
      return { rows: existing ? [existing] : [], rowCount: existing ? 1 : 0 }
    }

    // INSERT INTO tag_follows (user_id, tag)
    if (sql.includes('insert into tag_follows')) {
      const userId = params[0]
      const tag = params[1]
      const newFollow = {
        id: `tf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        user_id: userId,
        tag: tag,
        created_at: new Date().toISOString()
      }
      mockData.tag_follows.push(newFollow)
      return { rows: [newFollow], rowCount: 1 }
    }

    // DELETE FROM tag_follows WHERE user_id = $1 AND tag = $2 RETURNING id
    if (sql.includes('delete from tag_follows')) {
      const userId = params[0]
      const tag = params[1]
      const idx = mockData.tag_follows.findIndex(tf => tf.user_id === userId && tf.tag.toLowerCase() === tag?.toLowerCase())
      if (idx !== -1) {
        const removed = mockData.tag_follows.splice(idx, 1)[0]
        return { rows: [removed], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }
  }

  // -----------------------------------------------------------
  // 2. USER FOLLOWS
  // -----------------------------------------------------------
  if (sql.includes('user_follows')) {
    // SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2
    if (sql.includes('select id from user_follows')) {
      const followerId = params[0]
      const followingId = params[1]
      const existing = mockData.user_follows.find(uf => uf.follower_id === followerId && uf.following_id === followingId)
      return { rows: existing ? [existing] : [], rowCount: existing ? 1 : 0 }
    }

    // INSERT INTO user_follows (follower_id, following_id)
    if (sql.includes('insert into user_follows')) {
      const followerId = params[0]
      const followingId = params[1]
      const newFollow = {
        id: `uf_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      }
      mockData.user_follows.push(newFollow)
      return { rows: [newFollow], rowCount: 1 }
    }

    // DELETE FROM user_follows
    if (sql.includes('delete from user_follows')) {
      const followerId = params[0]
      const followingId = params[1]
      const idx = mockData.user_follows.findIndex(uf => uf.follower_id === followerId && uf.following_id === followingId)
      if (idx !== -1) {
        const removed = mockData.user_follows.splice(idx, 1)[0]
        return { rows: [removed], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }

    // GET followers/following
    if (sql.includes('join user_follows')) {
      if (sql.includes('uf.following_id = $1')) {
        // followers of user $1
        const followers = mockData.user_follows
          .filter(uf => uf.following_id === params[0])
          .map(uf => mockData.users.find(u => u.id === uf.follower_id))
          .filter(Boolean)
        return { rows: followers, rowCount: followers.length }
      }
      if (sql.includes('uf.follower_id = $1')) {
        // following of user $1
        const following = mockData.user_follows
          .filter(uf => uf.follower_id === params[0])
          .map(uf => mockData.users.find(u => u.id === uf.following_id))
          .filter(Boolean)
        return { rows: following, rowCount: following.length }
      }
    }
  }

  // -----------------------------------------------------------
  // 3. USERS (SELECT, INSERT, UPDATE)
  // -----------------------------------------------------------
  // SELECT user by email/username
  if (sql.includes('from users') && sql.includes('where email =') && sql.includes('or username =')) {
    const user = mockData.users.find(u => u.email === params[0] || u.username === params[1])
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  // SELECT user by email
  if (sql.includes('from users') && sql.includes('where email =')) {
    const user = mockData.users.find(u => u.email === params[0])
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  // SELECT user by id
  if (sql.includes('from users') && sql.includes('where id =')) {
    const user = mockData.users.find(u => u.id === params[0])
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  // INSERT user
  if (sql.includes('insert into users')) {
    const newUser = {
      id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      username: params[0] || 'user_' + Date.now(),
      email: params[1] || 'user@example.com',
      password_hash: params[2] || '',
      bio: params[3] || null,
      avatar_url: null,
      carbon_credits: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    mockData.users.push(newUser)
    return { rows: [newUser], rowCount: 1 }
  }

  // UPDATE users
  if (sql.includes('update users')) {
    // Addition: carbon_credits = carbon_credits + $1
    if (sql.includes('carbon_credits = carbon_credits +')) {
      const amount = Number(params[0] || 0)
      const userId = params[1]
      const user = mockData.users.find(u => u.id === userId)
      if (user) user.carbon_credits = (user.carbon_credits || 0) + amount
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
    }
    // Subtraction: carbon_credits = carbon_credits - $1
    if (sql.includes('carbon_credits = carbon_credits -')) {
      const amount = Number(params[0] || 0)
      const userId = params[1]
      const user = mockData.users.find(u => u.id === userId)
      if (user) user.carbon_credits = Math.max(0, (user.carbon_credits || 0) - amount)
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
    }
    // General profile update
    const userId = params[params.length - 1]
    const user = mockData.users.find(u => u.id === userId)
    if (user) {
      if (params[0] !== undefined) user.username = params[0]
      if (params[1] !== undefined) user.bio = params[1]
      if (params[2] !== undefined) user.avatar_url = params[2]
      user.updated_at = new Date().toISOString()
    }
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  // -----------------------------------------------------------
  // 4. POSTS (SELECT, INSERT, UPDATE)
  // -----------------------------------------------------------
  if (sql.includes('from posts')) {
    if (sql.includes('count(*) as post_count')) {
      const userId = params[0]
      const userPosts = mockData.posts.filter(p => p.user_id === userId && p.status === 'PUBLISHED')
      const totalPoints = userPosts.reduce((sum, p) => sum + (p.points || 0), 0)
      return {
        rows: [{ post_count: userPosts.length, total_points: totalPoints }],
        rowCount: 1
      }
    }

    let posts = [...mockData.posts]

    if (sql.includes('where id =') || sql.includes('where p.id =')) {
      const p = posts.find(post => post.id === params[0])
      if (p) {
        const author = mockData.users.find(u => u.id === p.user_id) || { username: 'eco_user', avatar_url: null }
        return { rows: [{ ...p, username: author.username, avatar_url: author.avatar_url }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    }

    // Filter by user_id
    if (sql.includes('where user_id =') || sql.includes('where p.user_id =')) {
      posts = posts.filter(post => post.user_id === params[0])
    }

    // Filter by search / username (Discover page)
    if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%') && params[0].endsWith('%')) {
      const searchTerm = params[0].replace(/%/g, '').toLowerCase()
      posts = posts.filter(post => {
        const author = mockData.users.find(u => u.id === post.user_id)
        const usernameMatch = author?.username.toLowerCase().includes(searchTerm)
        const bioMatch = author?.bio?.toLowerCase().includes(searchTerm)
        const descMatch = post.description.toLowerCase().includes(searchTerm)
        return usernameMatch || bioMatch || descMatch
      })
    }

    // Personalized feed query (home/feed)
    if (sql.includes('home/feed') || sql.includes('tag_follows') || sql.includes('following_id')) {
      const userId = params[0]
      const userFollowedTags = mockData.tag_follows.filter(tf => tf.user_id === userId).map(tf => tf.tag.toLowerCase())
      const userFollowing = mockData.user_follows.filter(uf => uf.follower_id === userId).map(uf => uf.following_id)

      if (userFollowedTags.length > 0 || userFollowing.length > 0) {
        const filtered = posts.filter(post => {
          const isFollowingUser = userFollowing.includes(post.user_id)
          const isFollowingTag = post.tags.some(t => userFollowedTags.includes(t.toLowerCase()))
          return isFollowingUser || isFollowingTag
        })
        if (filtered.length > 0) posts = filtered
      }
    }

    const resultRows = posts.map(p => {
      const author = mockData.users.find(u => u.id === p.user_id) || { username: 'eco_warrior', avatar_url: null }
      return { ...p, username: author.username, avatar_url: author.avatar_url }
    })
    return { rows: resultRows, rowCount: resultRows.length }
  }

  // INSERT post
  if (sql.includes('insert into posts')) {
    const newPost = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      user_id: params[0],
      image_url: params[1],
      description: params[2],
      tags: params[3] || [],
      points: 0,
      status: 'PENDING_POINTS',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    mockData.posts.unshift(newPost)
    return { rows: [newPost], rowCount: 1 }
  }

  // UPDATE post status/points
  if (sql.includes('update posts')) {
    const points = Number(params[0] || 0)
    const status = params[1] || 'PUBLISHED'
    const postId = params[2]
    const post = mockData.posts.find(p => p.id === postId)
    if (post) {
      if (sql.includes('points =')) post.points = points
      if (sql.includes('status =') || status) post.status = status
    }
    return { rows: post ? [post] : [], rowCount: post ? 1 : 0 }
  }

  // -----------------------------------------------------------
  // 5. REWARDS & REDEMPTIONS
  // -----------------------------------------------------------
  if (sql.includes('from rewards')) {
    if (sql.includes('where id =')) {
      const r = mockData.rewards.find(rew => rew.id === params[0])
      return { rows: r ? [r] : [], rowCount: r ? 1 : 0 }
    }
    return { rows: mockData.rewards, rowCount: mockData.rewards.length }
  }

  if (sql.includes('insert into redemptions')) {
    const userId = params[0]
    const pointsSpent = params[1]
    const rewardId = params[2]
    const reward = mockData.rewards.find(r => r.id === rewardId)
    const newRedemption = {
      id: `red_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      points_spent: pointsSpent,
      reward_item: reward?.name || 'Eco Reward',
      reward_description: reward?.description || '',
      created_at: new Date().toISOString()
    }
    mockData.redemptions.unshift(newRedemption)
    return { rows: [newRedemption], rowCount: 1 }
  }

  if (sql.includes('from redemptions')) {
    const userId = params[0]
    const userRedemptions = mockData.redemptions.filter(r => r.user_id === userId)
    return { rows: userRedemptions, rowCount: userRedemptions.length }
  }

  // Default fallback empty rows
  return { rows: [], rowCount: 0 }
}

const pool = {
  query: async (text: string, params?: any[]) => {
    if (isPgConnected) {
      try {
        return await pgPool.query(text, params)
      } catch (err) {
        console.warn('⚠️ Postgres query failed, falling back to Mock DB:', (err as Error).message)
      }
    }
    return executeMockQuery(text, params)
  },
  connect: async () => {
    if (isPgConnected) {
      try {
        return await pgPool.connect()
      } catch (err) {
        console.warn('⚠️ Postgres client connect failed, using Mock client')
      }
    }
    return {
      query: async (text: string, params?: any[]) => executeMockQuery(text, params),
      release: () => {}
    }
  },
  on: (event: string, listener: (...args: any[]) => void) => {
    pgPool.on(event as any, listener)
  }
}

export default pool