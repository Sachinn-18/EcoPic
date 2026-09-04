import axios from 'axios'
import toast from 'react-hot-toast'

import { 
  User, 
  Post, 
  Reward, 
  Redemption, 
  AuthResponse, 
  LoginData, 
  RegisterData, 
  CreatePostData 
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// IMPORTANT: backend uses /api prefix
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach auth token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let lastErrorTime = 0
const ERROR_THROTTLE_MS = 1000

// Error + token refresh handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'An error occurred'

    const isReadOnly =
      originalRequest.method === 'get' ||
      originalRequest.method === 'head'

    // Handle 401 & 403: try refresh token or redirect to login
    const status = error.response?.status
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true

      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken && !isAuthPage) {
        try {
          // CORRECT ROUTE: backend mounted at /api/auth/refresh
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            { refresh_token: refreshToken }
          )

          const newToken = response.data.access_token
          localStorage.setItem('auth_token', newToken)

          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)

        } catch (refreshError) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          if (!isAuthPage) {
            window.location.href = '/login'
            toast.error('Session expired. Please login again.')
          }
          return Promise.reject(refreshError)
        }
      } else if (!isAuthPage) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }

    // Show toast only for mutations, not GET
    const now = Date.now()
    if (!isReadOnly && now - lastErrorTime > ERROR_THROTTLE_MS) {
      toast.error(message)
      lastErrorTime = now
    }

    return Promise.reject(error)
  }
)

// ---------------------------
//           AUTH
// ---------------------------
export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}

// ---------------------------
//           USERS
// ---------------------------
export const userAPI = {
  getProfile: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/users/${userId}`)
    return response.data
  },

  updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${userId}`, updates)
    return response.data
  },

  followUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/users/${userId}/follow`)
    return response.data
  },

  unfollowUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/users/${userId}/follow`)
    return response.data
  },

  // ⭐ ADD THESE BACK ⭐
  followTag: async (tag: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/users/tags/follow', { tag })
    return response.data
  },

  unfollowTag: async (tag: string): Promise<{ message: string }> => {
    const response = await apiClient.request({
      url: '/users/tags/follow',
      method: 'DELETE',
      data: { tag },
      headers: { 'Content-Type': 'application/json' }
    })
    return response.data
  },

  getFollowedTags: async (userId: string): Promise<string[]> => {
    const response = await apiClient.get(`/users/${userId}/followed-tags`)
    return response.data
  },
  getFollowers: async (userId: string, limit?: number, offset?: number) => {
  const response = await apiClient.get(`/users/${userId}/followers`, {
    params: { limit, offset }
  })
  return response.data
},

getFollowing: async (userId: string, limit?: number, offset?: number) => {
  const response = await apiClient.get(`/users/${userId}/following`, {
    params: { limit, offset }
  })
  return response.data
},

}


// ---------------------------
//           POSTS
// ---------------------------
export const postsAPI = {
  getPersonalizedFeed: async (
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<Post[]> => {
    const response = await apiClient.get('/posts/home/feed', {
      params: { userId, limit, offset },
    })
    return response.data
  },

  getPosts: async (params?: {
    tag?: string
    tags?: string
    username?: string
    limit?: number
    offset?: number
  }): Promise<Post[]> => {
    const response = await apiClient.get('/posts', { params })
    return response.data
  },

  getPost: async (postId: string): Promise<Post> => {
    const response = await apiClient.get(`/posts/${postId}`)
    return response.data
  },

  createPost: async (data: CreatePostData): Promise<Post> => {
    const formData = new FormData()
    formData.append('image', data.image)
    formData.append('description', data.description)
    formData.append('tags', JSON.stringify(data.tags))

    const response = await apiClient.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deletePost: async (postId: string): Promise<void> => {
    await apiClient.delete(`/posts/${postId}`)
  },
}

// ---------------------------
//           REWARDS
// ---------------------------
export const rewardsAPI = {
  getRewards: async (): Promise<Reward[]> => {
    const response = await apiClient.get('/rewards')
    return response.data
  },

  getReward: async (rewardId: string): Promise<Reward> => {
    const response = await apiClient.get(`/rewards/${rewardId}`)
    return response.data
  },

  redeemCart: async (
    items: Array<{ reward_id: string; quantity: number }>
  ): Promise<any> => {
    const response = await apiClient.post('/rewards/redeem', { items })
    return response.data
  },
}

export default apiClient
