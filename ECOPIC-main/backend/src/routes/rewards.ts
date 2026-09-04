import express from 'express'
import pool from '../utils/database'
import { authenticateToken } from '../utils/auth'
import Joi from 'joi'

const router = express.Router()

// Get all available rewards
router.get('/', async (_req, res): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, points_required, quantity, image_url, is_active 
       FROM rewards 
       WHERE is_active = TRUE 
       ORDER BY points_required ASC`,
      []
    )

    const rewards = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      points_required: row.points_required,
      quantity_available: row.quantity === -1 ? 'unlimited' : row.quantity,
      image_url: row.image_url,
      is_active: row.is_active
    }))

    res.json(rewards)
  } catch (error) {
    console.error('Get rewards error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get single reward
router.get('/:id', async (req, res): Promise<any> => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT id, name, description, points_required, quantity, image_url, is_active 
       FROM rewards 
       WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reward not found' })
    }

    const reward = result.rows[0]
    res.json({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      points_required: reward.points_required,
      quantity_available: reward.quantity === -1 ? 'unlimited' : reward.quantity,
      image_url: reward.image_url,
      is_active: reward.is_active
    })
  } catch (error) {
    console.error('Get reward error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Redeem rewards (purchase cart items)
const redeemSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        reward_id: Joi.string().uuid().required(),
        quantity: Joi.number().integer().min(1).max(100).required()
      })
    )
    .min(1)
    .required()
})

router.post('/redeem', authenticateToken, async (req, res): Promise<any> => {
  try {
    const { items } = req.body
    const userId = req.user!.userId

    // Validate input
    const { error } = redeemSchema.validate({ items })
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details[0].message
      })
    }

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Get user's current credits
      const userResult = await client.query(
        'SELECT carbon_credits FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      )

      if (userResult.rows.length === 0) {
        throw new Error('User not found')
      }

      const currentCredits = userResult.rows[0].carbon_credits
      let totalPointsNeeded = 0
      const redemptionDetails = []

      // Calculate total points and check availability
      for (const item of items) {
        const rewardResult = await client.query(
          'SELECT id, name, description, points_required, quantity FROM rewards WHERE id = $1 AND is_active = TRUE',
          [item.reward_id]
        )

        if (rewardResult.rows.length === 0) {
          throw new Error(`Reward ${item.reward_id} not found or inactive`)
        }

        const reward = rewardResult.rows[0]
        const pointsForItem = reward.points_required * item.quantity
        totalPointsNeeded += pointsForItem

        // Check quantity if limited
        if (reward.quantity > 0 && reward.quantity < item.quantity) {
          throw new Error(`Not enough stock for ${reward.name}. Available: ${reward.quantity}`)
        }

        redemptionDetails.push({
          reward_id: reward.id,
          reward_name: reward.name,
          quantity: item.quantity,
          points_per_item: reward.points_required,
          total_points: pointsForItem
        })
      }

      // Check if user has enough credits
      if (currentCredits < totalPointsNeeded) {
        throw new Error('Insufficient credits')
      }

      // Deduct credits from user
      await client.query(
        'UPDATE users SET carbon_credits = carbon_credits - $1 WHERE id = $2',
        [totalPointsNeeded, userId]
      )

      // Create redemption records and update reward quantities
      const redemptionIds = []
      for (const detail of redemptionDetails) {
        // Record redemption
        const redemptionResult = await client.query(
          `INSERT INTO redemptions (user_id, points_spent, reward_item, reward_description)
           SELECT $1, $2, name, description FROM rewards WHERE id = $3
           RETURNING id`,
          [userId, detail.total_points, detail.reward_id]
        )
        redemptionIds.push(redemptionResult.rows[0].id)

        // Update reward quantity if not unlimited
        const rewardQtyResult = await client.query(
          'SELECT quantity FROM rewards WHERE id = $1',
          [detail.reward_id]
        )

        if (rewardQtyResult.rows[0].quantity > 0) {
          await client.query(
            'UPDATE rewards SET quantity = quantity - $1 WHERE id = $2',
            [detail.quantity, detail.reward_id]
          )
        }
      }

      await client.query('COMMIT')

      // Get updated user data
      const updatedUserResult = await pool.query(
        'SELECT carbon_credits FROM users WHERE id = $1',
        [userId]
      )

      res.status(201).json({
        message: 'Redemption successful',
        redemption_ids: redemptionIds,
        items_redeemed: redemptionDetails,
        total_points_spent: totalPointsNeeded,
        remaining_credits: updatedUserResult.rows[0].carbon_credits,
        order_status: 'processing'
      })
    } catch (transactionError: any) {
      await client.query('ROLLBACK')
      throw transactionError
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Redeem rewards error:', error)
    res.status(400).json({
      message: error.message || 'Redemption failed',
      error: error.message
    })
  }
})

// Get redemption history (commented out - to be exported to order processing site)
/*
router.get('/history', authenticateToken, async (req, res): Promise<any> => {
  try {
    const userId = req.user!.userId
    const limit = parseInt(req.query.limit as string) || 20
    const offset = parseInt(req.query.offset as string) || 0

    const result = await pool.query(
      `SELECT id, user_id, points_spent, reward_item, reward_description, created_at
       FROM redemptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    res.json({
      redemptions: result.rows,
      total: result.rowCount
    })
  } catch (error) {
    console.error('Get redemption history error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get all redemptions (admin) - commented out
router.get('/admin/all', authenticateToken, async (req, res): Promise<any> => {
  try {
    // TODO: Add admin role check

    const result = await pool.query(
      `SELECT r.id, u.username, u.email, r.points_spent, r.reward_item, r.created_at
       FROM redemptions r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    )

    res.json({
      total_redemptions: result.rowCount,
      data: result.rows
    })
  } catch (error) {
    console.error('Get all redemptions error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Export redemption data for order processing - commented out
export function exportRedemptionData() {
  return {
    description: 'This function exports redemption data to be used by the order processing site',
    endpoint: 'GET /api/rewards/history',
    data_structure: {
      redemptions: [
        {
          id: 'uuid',
          user_id: 'uuid',
          points_spent: 'number',
          reward_item: 'string',
          reward_description: 'string',
          created_at: 'timestamp'
        }
      ]
    },
    usage: 'Connect to external order processing system via API at /api/rewards/history'
  }
}
*/

export default router
