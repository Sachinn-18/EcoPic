import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsAPI } from '../api/client'
import { Post } from '../types'
import toast from 'react-hot-toast'

export default function FeedPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string | undefined>()

  const popularTags = ['tree-planting', 'cleanup', 'recycling', 'energy-saving', 'community']

  useEffect(() => {
    fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const fetchedPosts = await postsAPI.getPosts({
        tag: selectedTag,
        limit: 20
      })
      setPosts(fetchedPosts)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-eco-light mb-2">Eco Action Feed</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Discover amazing eco-friendly actions from the community</p>

        {/* Tag Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(undefined)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              !selectedTag
                ? 'pill-gradient text-black'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedTag === tag
                  ? 'pill-gradient text-black'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

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
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-2">
            {selectedTag ? `No posts found for "${selectedTag}"` : 'No posts yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {selectedTag ? 'Try selecting a different tag or check back later.' : 'Be the first to share an eco action!'}
          </p>
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
                      e.currentTarget.src =
                        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
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
