import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { postsAPI } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Post } from '../types'
import toast from 'react-hot-toast'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPost()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchPost = async () => {
    try {
      setLoading(true)
      const fetchedPost = await postsAPI.getPost(id!)
      setPost(fetchedPost)
    } catch (error) {
      console.error('Failed to fetch post:', error)
      toast.error('Failed to load post')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      setDeleting(true)
      await postsAPI.deletePost(id!)
      toast.success('Post deleted successfully')
      navigate('/')
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('Failed to delete post')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="card animate-pulse">
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-eco-light mb-2">Post not found</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">The post you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go to Feed
        </button>
      </div>
    )
  }

  const isOwner = user?.id === post.user_id

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-leaf-600 dark:hover:text-eco-green mb-6 transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        Back
      </button>

      {/* Post Card */}
      <div className="card overflow-hidden">
        {/* Image */}
        <div className="w-full h-96 bg-gray-200 dark:bg-gray-800">
          {post.image_url ? (
            <img
              src={
  post.image_url?.startsWith("http")
    ? post.image_url
    : `http://localhost:3001${post.image_url}`
}
              alt="Post"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg=='
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-400">
              No image available
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {/* User Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-leaf-100 dark:bg-gray-700 rounded-full flex items-center justify-center mr-4">
                <span className="text-leaf-600 dark:text-eco-green font-semibold text-lg">
                  {post.user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{post.user?.username || 'Anonymous'}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{formatDate(post.created_at)}</p>
              </div>
            </div>

            {/* Delete Button (only for post owner) */}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
              {post.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 bg-leaf-100 dark:bg-gray-700 text-leaf-700 dark:text-eco-green rounded-full text-sm font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Points */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
              <span className="text-sm">Carbon credits earned:</span>
            </div>
            <div className="flex items-center">
              <span className="text-3xl font-bold text-leaf-600 dark:text-eco-green">+{post.points}</span>
              <span className="ml-2 text-gray-600 dark:text-gray-300">credits</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
