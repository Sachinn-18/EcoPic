export interface User {
  id: string
  username: string
  email: string
  bio?: string
  avatar_url?: string
  carbon_credits: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  user?: User
  image_url: string
  description: string
  tags: string[]
  points: number
  status: 'PENDING_POINTS' | 'PUBLISHED' | 'PENDING_RETRY' | 'FAILED'
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  name: string
  description: string
  points_required: number
  quantity: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Redemption {
  id: string
  user_id: string
  points_spent: number
  reward_item: string
  reward_description: string
  created_at: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  bio?: string
}

export interface CreatePostData {
  image: File
  description: string
  tags: string[]
}

export interface ApiError {
  message: string
  code?: string
}