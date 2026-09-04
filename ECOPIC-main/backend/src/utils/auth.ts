import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

export interface JWTPayload {
  userId: string
  email: string
}

export const generateTokens = (payload: JWTPayload) => {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret-key-development',
    { expiresIn: '15m' }
  )
  
  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key-development',
    { expiresIn: '30d' }
  )
  
  return { accessToken, refreshToken }
}

export const verifyToken = (token: string, isRefresh = false) => {
  const secret = isRefresh 
    ? (process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key-development')
    : (process.env.JWT_ACCESS_SECRET || 'your-jwt-access-secret-key-development')
  
  return jwt.verify(token, secret) as JWTPayload
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}