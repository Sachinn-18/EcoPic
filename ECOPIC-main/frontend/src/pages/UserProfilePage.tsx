import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PencilIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../store/authStore'
import { userAPI, postsAPI } from '../api/client'
import { User, Post } from '../types'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

interface ProfileStats {
  posts_count: number
  total_points_earned: number
}

interface UserWithStats extends User {
  stats: ProfileStats
}

interface EditProfileForm {
  username: string
  bio: string
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser, isAuthenticated, updateUser } = useAuthStore()
  const [profileUser, setProfileUser] = useState<UserWithStats | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const isOwnProfile = currentUser?.id === id
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EditProfileForm>()

  useEffect(() => {
    if (id) {
      fetchProfile()
      fetchUserPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const userData = await userAPI.getProfile(id!)
      setProfileUser(userData as UserWithStats)
      reset({
        username: userData.username,
        bio: userData.bio || ''
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true)
      const posts = await postsAPI.getPosts({ limit: 20 }) // backend ideally filters by user
      // Filter posts by user on frontend for now
      const filteredPosts = posts.filter(post => post.user_id === id)
      setUserPosts(filteredPosts)
    } catch (error) {
      console.error('Failed to fetch user posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setPostsLoading(false)
    }
  }

  const onUpdateProfile = async (data: EditProfileForm) => {
    try {
      setIsUpdating(true)
      const updatedUser = await userAPI.updateProfile(id!, data)
      setProfileUser(prev => prev ? { ...prev, ...updatedUser } : null)
      
      // Update current user in store if editing own profile
      if (isOwnProfile && typeof updateUser === 'function') {
        updateUser(updatedUser)
      }
      
      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="card mb-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-48"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-64"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-2">Profile not found</h3>
        <p className="text-gray-600 dark:text-gray-300">The user profile you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-leaf-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
              {profileUser.avatar_url ? (
                <img 
                  src={profileUser.avatar_url} 
                  alt={profileUser.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-leaf-600">
                  {profileUser.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {!isEditing ? (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{profileUser.username}</h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{profileUser.bio || 'No bio yet'}</p>
                  <p className="text-leaf-600 font-semibold mt-2">
                    🌿 Total Credits: {(profileUser.carbon_credits ?? 0).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Member since {formatDate(profileUser.created_at)}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{profileUser.stats?.posts_count ?? 0} posts</span>
                    <span>{profileUser.stats?.total_points_earned ?? 0} points earned</span>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
                  <div>
                    <input
                      {...register('username', {
                        required: 'Username is required',
                        minLength: { value: 3, message: 'Username must be at least 3 characters' }
                      })}
                      className="text-2xl font-bold bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-leaf-600 dark:focus:border-eco-green outline-none w-full"
                      placeholder="Username"
                    />
                    {errors.username && (
                      <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                    )}
                  </div>
                  <div>
                    <textarea
                      {...register('bio', { maxLength: { value: 500, message: 'Bio too long' } })}
                      rows={3}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded focus:border-leaf-600 dark:focus:border-eco-green outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Tell us about yourself..."
                    />
                    {errors.bio && (
                      <p className="text-sm text-red-600 mt-1">{errors.bio.message}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-leaf-600 hover:bg-leaf-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        // restore form to current profileUser values
                        reset({
                          username: profileUser.username,
                          bio: profileUser.bio || ''
                        })
                      }}
                      className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          {isOwnProfile && !isEditing && isAuthenticated && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-leaf-600 dark:hover:text-eco-green transition-colors"
              title="Edit profile"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-4">
          {isOwnProfile ? 'My Eco Actions' : `${profileUser.username}'s Eco Actions`}
        </h2>
        
        {postsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : userPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">
              {isOwnProfile ? "You haven't shared any eco actions yet." : `${profileUser.username} hasn't shared any eco actions yet.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userPosts.map((post) => (
              <div key={post.id} className="card hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2 overflow-hidden">
                  {post.image_url ? (
                    <img
                      src={
  post.image_url?.startsWith("http")
    ? post.image_url
    : `http://localhost:3001${post.image_url}`
}
                      alt="Eco action"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{post.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs bg-leaf-100 dark:bg-gray-700 text-leaf-700 dark:text-eco-green px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-leaf-600 dark:text-eco-green">+{post.points} credits</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
