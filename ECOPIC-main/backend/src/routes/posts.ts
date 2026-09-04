import express from 'express'
import multer from 'multer'
import path from 'path'
import pool from '../utils/database'
import { authenticateToken } from '../utils/auth'
import Joi from 'joi'
import axios from 'axios'

import fs from 'fs'

import FormData from 'form-data'

const router = express.Router()

// -------------------------------------------------------
// CONFIG
// -------------------------------------------------------

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001"

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    cb(null, 'uploads/')
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed') as any, false)
    }
    cb(null, true)
  }
})

// Validation schema
const createPostSchema = Joi.object({
  description: Joi.string().min(5).max(1000).required(),
  tags: Joi.array().items(Joi.string().min(1).max(50)).min(1).required(),
  latitude: Joi.number().min(-90).max(90).optional().allow(null, ''),
  longitude: Joi.number().min(-180).max(180).optional().allow(null, ''),
  location_name: Joi.string().max(200).optional().allow(null, '')
})

interface RewardResponse {
  points: number
  badge_unlocked?: string
}

// -------------------------------------------------------
// CREATE POST
// -------------------------------------------------------

router.post('/', authenticateToken, upload.single('image'), async (req, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' })
    }

    // Parse tags & location
    let parsed
    try {
      parsed = {
        description: req.body.description,
        tags: typeof req.body.tags === 'string'
          ? JSON.parse(req.body.tags)
          : req.body.tags,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        location_name: req.body.location_name
      }
    } catch {
      return res.status(400).json({ message: 'Invalid request format' })
    }

    // Validate
    const { error, value } = createPostSchema.validate(parsed)
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      })
    }

    const { description, tags, latitude, longitude, location_name } = value
    const imageUrl = `${BASE_URL}/uploads/${req.file.filename}`

    // Insert into DB (Status initially PENDING_POINTS)
    const result = await pool.query(
      `INSERT INTO posts (user_id, image_url, description, tags, status)
       VALUES ($1, $2, $3, $4, 'PENDING_POINTS')
       RETURNING *`,
      [req.user!.userId, imageUrl, description, tags]
    )

    const post = result.rows[0]

    // Send actual file stream + user_id + location metadata to ML Model service
    let points = 0
    let mlMessage = ''

    try {
      const formData = new FormData()
      formData.append('image', fs.createReadStream(req.file.path))
      formData.append('description', description)
      formData.append('tags', JSON.stringify(tags))
      formData.append('user_id', req.user!.userId)
      if (latitude) formData.append('latitude', String(latitude))
      if (longitude) formData.append('longitude', String(longitude))
      if (location_name) formData.append('location_name', location_name)

      const mlRes = await axios.post('http://127.0.0.1:5000/upload', formData, {
        headers: formData.getHeaders(),
        timeout: 10000
      })

      points = mlRes.data?.user_data?.carbon_credit_points ?? 0
      mlMessage = mlRes.data?.user_data?.message || ''
      console.log(`🤖 Anti-Cheat ML Verification Result: points=${points}, category=${mlRes.data?.user_data?.activity_category}`)
    } catch (mlErr) {
      console.warn("⚠️ Could not connect to Flask ML Model directly, trying middleware fallback...")
      try {
        const middlewareUrl = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:8000'
        const pointsResponse = await axios.post<RewardResponse>(
          `${middlewareUrl}/api/reward/`,
          {
            post_id: post.id,
            user_id: post.user_id,
            tags,
            description,
            image_url: imageUrl
          },
          { timeout: 10000 }
        )
        points = pointsResponse.data?.points ?? 0
      } catch (err) {
        console.error("Middleware & ML Model error:", err)
        points = 0
      }
    }

    // Update post with verified points
    await pool.query(
      'UPDATE posts SET points = $1, status = $2 WHERE id = $3',
      [points, 'PUBLISHED', post.id]
    )

    // Add carbon credits to user if points > 0
    if (points > 0) {
      await pool.query(
        'UPDATE users SET carbon_credits = carbon_credits + $1 WHERE id = $2',
        [points, req.user!.userId]
      )
    }

    const updatedPost = await pool.query(
      `SELECT p.*, u.username, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [post.id]
    )

    const finalPost = updatedPost.rows[0] || { ...post, points, status: 'PUBLISHED' }

    return res.status(201).json({
      message: points > 0
        ? `Post verified! You earned ${points} carbon credits.`
        : 'Post created, but 0 carbon credits awarded (photo failed green eco-action verification).',
      ml_message: mlMessage,
      post: finalPost
    })

  } catch (err) {
    console.error("Create post error:", err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})


// -------------------------------------------------------
// GET ALL POSTS (DISCOVER PAGE)
// -------------------------------------------------------

router.get('/', async (req, res) => {
  try {
    const { tag, tags, username, limit = 20, offset = 0 } = req.query

    let query = `
      SELECT p.*, u.username, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'PUBLISHED'
    `
    const params: any[] = []
    let count = 1

    if (tag) {
      query += ` AND $${count} = ANY(p.tags)`
      params.push(tag)
      count++
    }

    if (tags) {
      const t = (tags as string).split(',')
      query += ` AND (${t.map((_, i) => `$${count + i} = ANY(p.tags)`).join(' OR ')})`
      params.push(...t)
      count += t.length
    }

    if (username) {
      query += ` AND (u.username ILIKE $${count} OR u.bio ILIKE $${count})`
      params.push(`%${username}%`)
      count++
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${count} OFFSET $${count + 1}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    return res.json(result.rows)

  } catch (err) {
    console.error("Get posts error:", err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})


// -------------------------------------------------------
// HOME FEED (FOLLOWING + TAGS)
// -------------------------------------------------------

router.get('/home/feed', async (req, res) => {
  try {
    const { userId, limit = 20, offset = 0 } = req.query

    if (!userId) {
      return res.status(400).json({ message: "userId is required" })
    }

    let rows: any[] = []
    try {
      const query = `
        SELECT DISTINCT p.*, u.username, u.avatar_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'PUBLISHED'
        AND (
          p.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
          OR EXISTS (
            SELECT 1 FROM tag_follows WHERE user_id = $1 AND tag = ANY(p.tags)
          )
        )
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `
      const result = await pool.query(query, [userId, limit, offset])
      rows = result.rows || []
    } catch (queryErr) {
      console.warn("Personalized feed query warning, falling back to community feed:", queryErr)
    }

    // Fallback to general published community posts if personalized feed has no posts
    if (rows.length === 0) {
      const fallbackQuery = `
        SELECT p.*, u.username, u.avatar_url
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'PUBLISHED'
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
      `
      const fallbackResult = await pool.query(fallbackQuery, [limit, offset])
      rows = fallbackResult.rows || []
    }

    return res.json(rows)

  } catch (err) {
    console.error("Feed fetch error:", err)
    return res.json([])
  }
})


// -------------------------------------------------------
// GET SINGLE POST
// -------------------------------------------------------

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT p.*, u.username, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" })
    }

    return res.json(result.rows[0])

  } catch (err) {
    console.error("Get post error:", err)
    return res.status(500).json({ message: "Internal server error" })
  }
})


// -------------------------------------------------------
// DELETE POST
// -------------------------------------------------------

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const postResult = await pool.query(
      'SELECT * FROM posts WHERE id = $1',
      [id]
    )

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" })
    }

    const post = postResult.rows[0]

    if (post.user_id !== req.user!.userId) {
      return res.status(403).json({ message: "Not authorized" })
    }

    // Delete post
    await pool.query('DELETE FROM posts WHERE id = $1', [id])

    // Remove credits
    if (post.status === 'PUBLISHED' && post.points > 0) {
      await pool.query(
        'UPDATE users SET carbon_credits = GREATEST(carbon_credits - $1, 0) WHERE id = $2',
        [post.points, req.user!.userId]
      )
    }

    return res.json({ message: "Post deleted successfully" })

  } catch (err) {
    console.error("Delete post error:", err)
    return res.status(500).json({ message: "Internal server error" })
  }
})

export default router
