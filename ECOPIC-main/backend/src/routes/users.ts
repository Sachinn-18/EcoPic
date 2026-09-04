import express from 'express'
import pool from '../utils/database'
import { authenticateToken } from '../utils/auth'
import Joi from 'joi'

const router = express.Router()

// Validation schema for profile updates
const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  bio: Joi.string().max(500).optional().allow(''),
  avatar_url: Joi.string().uri().optional().allow('')
})

// ===== TAG ROUTES (must come before :id routes) =====

// Follow a tag
router.post('/tags/follow', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { tag } = req.body
    const userId = req.user!.userId
    
    if (!tag || typeof tag !== 'string' || tag.length === 0) {
      return res.status(400).json({ message: 'Invalid tag' })
    }
    
    // Check if already following
    const existingFollow = await pool.query(
      'SELECT id FROM tag_follows WHERE user_id = $1 AND tag = $2',
      [userId, tag]
    )
    
    if (existingFollow.rows.length > 0) {
      return res.status(400).json({ message: 'Already following this tag' })
    }
    
    // Create tag follow
    await pool.query(
      'INSERT INTO tag_follows (user_id, tag) VALUES ($1, $2)',
      [userId, tag]
    )
    
    res.status(201).json({ message: 'Successfully followed tag' })
  } catch (error) {
    console.error('Follow tag error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Unfollow a tag
router.delete('/tags/follow', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { tag } = req.body
    const userId = req.user!.userId
    
    if (!tag || typeof tag !== 'string' || tag.length === 0) {
      return res.status(400).json({ message: 'Invalid tag' })
    }
    
    const result = await pool.query(
      'DELETE FROM tag_follows WHERE user_id = $1 AND tag = $2 RETURNING id',
      [userId, tag]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not following this tag' })
    }
    
    res.json({ message: 'Successfully unfollowed tag' })
  } catch (error) {
    console.error('Unfollow tag error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// ===== USER ROUTES (routes with :id parameter) =====

// Get user profile
router.get('/:id', async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'SELECT id, username, email, bio, avatar_url, carbon_credits, created_at, updated_at FROM users WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    const user = result.rows[0]
    
    // Get user's posts count and total points earned
    const postsResult = await pool.query(
      'SELECT COUNT(*) as post_count, COALESCE(SUM(points), 0) as total_points FROM posts WHERE user_id = $1 AND status = $2',
      [id, 'PUBLISHED']
    )
    
    const postCount = postsResult.rows && postsResult.rows[0] ? postsResult.rows[0].post_count : 0
    const totalPoints = postsResult.rows && postsResult.rows[0] ? postsResult.rows[0].total_points : 0

    res.json({
      ...user,
      stats: {
        posts_count: parseInt(String(postCount)) || 0,
        total_points_earned: parseInt(String(totalPoints)) || 0
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update user profile (protected route)
router.put('/:id', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    
    // Check if user is updating their own profile
    if (req.user!.userId !== id) {
      return res.status(403).json({ message: 'Can only update your own profile' })
    }
    
    // Validate input
    const { error, value } = updateProfileSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      })
    }
    
    const { username, bio, avatar_url } = value
    
    // Check if new username is already taken (if provided)
    if (username) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      )
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: 'Username already taken' })
      }
    }
    
    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1
    
    if (username !== undefined) {
      updates.push(`username = $${paramCount}`)
      values.push(username)
      paramCount++
    }
    
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`)
      values.push(bio)
      paramCount++
    }
    
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount}`)
      values.push(avatar_url)
      paramCount++
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }
    
    values.push(id) // Add user ID for WHERE clause
    
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramCount} 
       RETURNING id, username, email, bio, avatar_url, carbon_credits, created_at, updated_at`,
      values
    )
    
    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Follow a user
router.post('/:id/follow', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    const followerId = req.user!.userId
    
    // Check if trying to follow yourself
    if (followerId === id) {
      return res.status(400).json({ message: 'Cannot follow yourself' })
    }
    
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [id])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // Check if already following
    const existingFollow = await pool.query(
      'SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, id]
    )
    
    if (existingFollow.rows.length > 0) {
      return res.status(400).json({ message: 'Already following this user' })
    }
    
    // Create follow
    await pool.query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, id]
    )
    
    res.status(201).json({ message: 'Successfully followed user' })
  } catch (error) {
    console.error('Follow user error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Unfollow a user
router.delete('/:id/follow', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    const followerId = req.user!.userId
    
    const result = await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2 RETURNING id',
      [followerId, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Not following this user' })
    }
    
    res.json({ message: 'Successfully unfollowed user' })
  } catch (error) {
    console.error('Unfollow user error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get user's followers
router.get('/:id/followers', async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio 
       FROM users u 
       JOIN user_follows uf ON u.id = uf.follower_id 
       WHERE uf.following_id = $1 
       ORDER BY uf.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get followers error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get user's following
router.get('/:id/following', async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio 
       FROM users u 
       JOIN user_follows uf ON u.id = uf.following_id 
       WHERE uf.follower_id = $1 
       ORDER BY uf.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get following error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get user's posts
router.get('/:id/posts', async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0
    
    const result = await pool.query(
      `SELECT p.*, u.username, u.avatar_url 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = $1 AND p.status = 'PUBLISHED'
       ORDER BY p.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get user posts error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get user's followed tags
router.get('/:id/followed-tags', async (req, res): Promise<any> => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'SELECT tag FROM tag_follows WHERE user_id = $1 ORDER BY created_at DESC',
      [id]
    )
    
    res.json(result.rows.map(r => r.tag))
  } catch (error) {
    console.error('Get followed tags error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
