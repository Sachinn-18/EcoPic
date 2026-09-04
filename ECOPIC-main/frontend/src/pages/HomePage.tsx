import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsAPI, userAPI } from '../api/client'
import { Post } from '../types'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [followedTags, setFollowedTags] = useState<string[]>([])
  const [emptyState, setEmptyState] = useState<'no-follows' | 'no-posts' | null>(null)

  useEffect(() => {
    if (user) {
      fetchData()
    } else {
      navigate('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  const fetchData = async () => {
    if (!user) return
    try {
      setLoading(true)
      
      // Get followed tags
      const tags = await userAPI.getFollowedTags(user.id)
      setFollowedTags(tags)
      
      // Get personalized feed
      const feedPosts = await postsAPI.getPersonalizedFeed(user.id, 20, 0)
      
      if (feedPosts.length === 0) {
        // Check if user has any follows
        const following = await userAPI.getFollowing(user.id, 1)
        if (tags.length === 0 && following.length === 0) {
          setEmptyState('no-follows')
        } else {
          setEmptyState('no-posts')
        }
      } else {
        setEmptyState(null)
      }
      
      setPosts(feedPosts)
    } catch (error) {
      console.error('Failed to fetch home feed:', error)
      toast.error('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }

  const handleUnfollowTag = async (tag: string) => {
    try {
      await userAPI.unfollowTag(tag)
      setFollowedTags(followedTags.filter(t => t !== tag))
      // Refresh feed
      await fetchData()
      toast.success(`Unfollowed #${tag}`)
    } catch (error) {
      console.error('Failed to unfollow tag:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-eco-light mb-2">Your Feed</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Posts from people and tags you follow</p>
      </div>

      {/* Followed Tags Display */}
      {followedTags.length > 0 && (
        <div className="mb-8 p-4 rounded-lg border border-leaf-200 bg-leaf-50 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Following {followedTags.length} tag{followedTags.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {followedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleUnfollowTag(tag)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-leaf-200 dark:border-gray-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                title="Click to unfollow"
              >
                <span className="text-leaf-600 dark:text-eco-green">#{tag}</span>
                <span className="text-gray-400 dark:text-gray-300 hover:text-red-500">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Posts Feed */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="flex justify-between">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : emptyState === 'no-follows' ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-2">Start Following to Build Your Feed</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Follow users and tags to see their eco-action posts in your personalized feed.
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="btn-primary"
          >
            Discover People &amp; Tags
          </button>
        </div>
      ) : emptyState === 'no-posts' ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-2">No New Posts Yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The people and tags you follow haven't posted anything new. Check back later!
          </p>
          <button
            onClick={() => navigate('/feed')}
            className="btn-primary"
          >
            Explore More
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-2">No Posts Found</h3>
          <p className="text-gray-600 dark:text-gray-300">Try following different users or tags.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/post/${post.id}`)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4 overflow-hidden">
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

              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-leaf-100 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                  <span className="text-leaf-600 dark:text-eco-green font-semibold text-sm">
                    {post.user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{post.user?.username || 'Anonymous'}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{formatDate(post.created_at)}</p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
                {post.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-wrap">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-leaf-100 dark:bg-gray-700 text-leaf-700 dark:text-eco-green px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">+{post.tags.length - 2}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-leaf-600 dark:text-eco-green">+{post.points} credits</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
