import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsAPI, userAPI } from '../api/client'
import { Post } from '../types'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function DiscoverFeedPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  // filtering
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchUsername, setSearchUsername] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')

  const [followedTags, setFollowedTags] = useState<string[]>([])

  const popularTags = [
    'tree-planting',
    'cleanup',
    'recycling',
    'energy-saving',
    'community',
    'composting',
    'water-saving'
  ]

  useEffect(() => {
    fetchPosts()
    if (user) fetchFollowedTags()
  }, [selectedTags, searchUsername, sortBy])

  const fetchFollowedTags = async () => {
    try {
      const tags = await userAPI.getFollowedTags(user!.id)
      setFollowedTags(tags)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params: any = {
        limit: 20,
        offset: 0
      }

      if (selectedTags.length) params.tags = selectedTags.join(',')
      if (searchUsername) params.username = searchUsername

      let fetched = await postsAPI.getPosts(params)

      if (sortBy === 'popular') {
        fetched = [...fetched].sort((a, b) => b.points - a.points)
      }

      setPosts(fetched)
    } catch (error) {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const followToggle = async (tag: string, isFollowed: boolean) => {
    if (!user) return navigate('/login')

    try {
      if (isFollowed) {
        await userAPI.unfollowTag(tag)
        setFollowedTags(prev => prev.filter(t => t !== tag))
      } else {
        await userAPI.followTag(tag)
        setFollowedTags(prev => [...prev, tag])
      }
    } catch {}
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 flex gap-10">

      {/* ---------------- LEFT SIDEBAR ---------------- */}
      <aside className="
        hidden lg:block w-72 
        glass-card p-5 rounded-2xl shadow-lg 
        h-fit sticky top-24
      ">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Trending Tags
        </h2>

        <div className="space-y-3">
          {popularTags.map(tag => {
            const isSelected = selectedTags.includes(tag)
            const isFollowed = followedTags.includes(tag)

            return (
              <div
                key={tag}
                className="flex items-center justify-between 
                px-3 py-3 rounded-xl 
                bg-white/40 dark:bg-white/5
                border border-gray-200 dark:border-white/10
                backdrop-blur-xl 
                transition hover:scale-[1.02]"
              >
                {/* tag button */}
                <button
                  onClick={() => toggleTag(tag)}
                  className={`
                    text-sm font-medium 
                    px-2 py-1 rounded-lg
                    transition
                    ${isSelected
                      ? 'bg-leaf-600 text-white'
                      : 'text-gray-800 dark:text-gray-200 hover:text-leaf-400'}
                  `}
                >
                  #{tag}
                </button>

                {/* follow button */}
                {user && (
                  <button
                    onClick={() => followToggle(tag, isFollowed)}
                    className={`
                      text-xs px-2 py-1 rounded-lg 
                      transition
                      ${isFollowed
                        ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-100'
                        : 'bg-leaf-100 dark:bg-gray-700 text-leaf-700 dark:text-eco-green'}
                    `}
                  >
                    {isFollowed ? '✓' : '+'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-1">

        {/* TITLE + SEARCH BAR INLINE */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Discover Eco Actions
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Explore actions from the community
            </p>
          </div>

          {/* search */}
          <div className="relative w-64 hidden md:block">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
            <input
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              placeholder="Search users..."
              className="
                w-full pl-10 pr-3 py-2 rounded-xl
                bg-white/60 dark:bg-white/10
                backdrop-blur-lg
                border border-gray-200 dark:border-white/10
                text-gray-800 dark:text-gray-200
                focus:outline-none
                focus:ring-2 focus:ring-leaf-500
              "
            />
          </div>
        </div>

        {/* SORT BUTTONS */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setSortBy('recent')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition
              ${sortBy === 'recent'
                ? 'bg-leaf-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}
            `}
          >
            Recent
          </button>

          <button
            onClick={() => setSortBy('popular')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition
              ${sortBy === 'popular'
                ? 'bg-leaf-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}
            `}
          >
            Popular
          </button>
        </div>

        {/* POSTS GRID */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="card animate-pulse h-60"
              ></div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-300">
            No posts found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => navigate(`/post/${post.id}`)}
                className="card cursor-pointer hover:-translate-y-1 transition"
              >
                {/* image */}
                <div className="h-40 mb-3 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                  {post.image_url ? (
                    <img
                      src={post.image_url.startsWith("http")
                        ? post.image_url
                        : `http://localhost:3001${post.image_url}`
                      }
                      className="w-full h-full object-cover"
                    />

                  ) : (
                    <div className="text-center text-gray-400 pt-12">No Image</div>
                  )}
                </div>

                {/* user */}
                <div className="flex items-center mb-2">
                  <div className="w-9 h-9 bg-leaf-100 dark:bg-gray-700 rounded-full flex items-center justify-center mr-3">
                    <span className="text-leaf-700 dark:text-eco-green font-semibold">
                      {post.user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {post.user?.username}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(post.created_at)}
                    </p>
                  </div>
                </div>

                {/* description */}
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                  {post.description}
                </p>

                {/* tags + credits */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {post.tags.slice(0, 2).map(t => (
                      <span
                        key={t}
                        className="px-2 py-1 rounded-full text-xs bg-leaf-100 dark:bg-gray-700 text-leaf-700 dark:text-eco-green"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <span className="text-leaf-600 dark:text-eco-green font-semibold">
                    +{post.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
