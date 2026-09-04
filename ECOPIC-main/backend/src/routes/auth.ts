import express from 'express'
import bcrypt from 'bcryptjs'
import Joi from 'joi'
import pool from '../utils/database'
import { generateTokens, verifyToken, authenticateToken } from '../utils/auth'

const router = express.Router()

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  bio: Joi.string().max(500).optional().allow('')
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

// Register endpoint
router.post('/register', async (req, res): Promise<any> => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      })
    }

    const { username, email, password, bio } = value

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, bio, carbon_credits) 
       VALUES ($1, $2, $3, $4, 0) 
       RETURNING id, username, email, bio, carbon_credits, created_at, updated_at`,
      [username, email, passwordHash, bio || null]
    )

    const user = result.rows[0]

    // Generate tokens
    const tokens = generateTokens({ userId: user.id, email: user.email })

    // Store refresh token in database
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, await bcrypt.hash(tokens.refreshToken, 10), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    )

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        carbon_credits: user.carbon_credits,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Login endpoint
router.post('/login', async (req, res): Promise<any> => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      })
    }

    const { email, password } = value

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, bio, carbon_credits, created_at, updated_at FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate tokens
    const tokens = generateTokens({ userId: user.id, email: user.email })

    // Store refresh token
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, await bcrypt.hash(tokens.refreshToken, 10), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    )

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        carbon_credits: user.carbon_credits,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Refresh token endpoint
router.post('/refresh', async (req, res): Promise<any> => {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      return res.status(401).json({ message: 'Refresh token required' })
    }

    // Verify refresh token
    const decoded = verifyToken(refresh_token, true)

    // Check if refresh token exists in database and is valid
    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [decoded.userId]
    )

    if (tokenResult.rows.length === 0) {
      return res.status(403).json({ message: 'Invalid refresh token' })
    }

    // Get user data
    const userResult = await pool.query(
      'SELECT id, username, email, bio, carbon_credits, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = userResult.rows[0]

    // Generate new tokens
    const tokens = generateTokens({ userId: user.id, email: user.email })

    // Update refresh token in database
    await pool.query(
      'UPDATE refresh_tokens SET token_hash = $1, expires_at = $2 WHERE user_id = $3',
      [await bcrypt.hash(tokens.refreshToken, 10), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), user.id]
    )

    res.json({
      message: 'Tokens refreshed',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        carbon_credits: user.carbon_credits,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(403).json({ message: 'Invalid refresh token' })
  }
})

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res): Promise<any> => {
  try {
    // Remove refresh token from database
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user!.userId])
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router