import { useState, useEffect } from 'react'
import { rewardsAPI, userAPI } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ShoppingCartIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Reward {
  id: string
  name: string
  description: string
  points_required: number
  quantity_available: string | number
  image_url?: string
}

interface CartItem {
  reward: Reward
  quantity: number
  total_points: number
}

export default function RedeemPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [userCredits, setUserCredits] = useState(0)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // --- Normalizes API response into Reward[] shape ---
  const fetchData = async () => {
    if (!user) return
    try {
      setLoading(true)
      const [rawRewards, userData] = await Promise.all([
        rewardsAPI.getRewards(),
        userAPI.getProfile(user.id)
      ])

      // Normalize incoming reward objects so they match our Reward interface
      const normalized: Reward[] = (rawRewards as any[]).map((r) => ({
        id: r.id ?? r.reward_id ?? String(r._id ?? ''),
        name: r.name ?? r.title ?? 'Unnamed reward',
        description: r.description ?? r.desc ?? '',
        // tolerate different field names for points
        points_required: typeof r.points_required === 'number' ? r.points_required : (r.points ?? r.cost ?? 0),
        // default to 'unlimited' when not provided
        quantity_available: r.quantity_available ?? r.quantity ?? r.stock ?? 'unlimited',
        image_url: r.image_url ?? r.imageUrl ?? r.image ?? undefined
      }))

      setRewards(normalized)
      setUserCredits(userData?.carbon_credits ?? 0)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (reward: Reward) => {
    // If reward has numeric stock, ensure we don't add more than available
    const available =
      typeof reward.quantity_available === 'number'
        ? (reward.quantity_available as number)
        : Infinity

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.reward.id === reward.id)
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1
        if (newQuantity > available) {
          toast.error('Not enough stock available')
          return prevCart
        }
        return prevCart.map(item =>
          item.reward.id === reward.id
            ? {
                ...item,
                quantity: newQuantity,
                total_points: reward.points_required * newQuantity
              }
            : item
        )
      }
      if (available <= 0) {
        toast.error('Out of stock')
        return prevCart
      }
      return [
        ...prevCart,
        {
          reward,
          quantity: 1,
          total_points: reward.points_required
        }
      ]
    })
    toast.success(`Added ${reward.name} to cart`)
  }

  const updateCartQuantity = (rewardId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(rewardId)
      return
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.reward.id === rewardId
          ? {
              ...item,
              quantity,
              total_points: item.reward.points_required * quantity
            }
          : item
      )
    )
  }

  const removeFromCart = (rewardId: string) => {
    setCart(prevCart => prevCart.filter(item => item.reward.id !== rewardId))
    toast.success('Item removed from cart')
  }

  // safe reduce with initial 0
  const getTotalPoints = () => cart.reduce((sum, item) => sum + item.total_points, 0)

  const canCheckout = () => userCredits >= getTotalPoints() && cart.length > 0

  const handleCheckout = async () => {
    if (!user || !canCheckout()) {
      toast.error('Cannot checkout')
      return
    }

    try {
      setProcessing(true)
      const items = cart.map(item => ({
        reward_id: item.reward.id,
        quantity: item.quantity
      }))

      const result = await rewardsAPI.redeemCart(items)

      toast.success('Redemption successful! Your order is being processed.')
      setCart([])
      setShowCart(false)

      // Update user credits in both local state and auth store
      setUserCredits(result.remaining_credits)
      try {
        if (typeof updateUser === 'function') {
          updateUser({ carbon_credits: result.remaining_credits })
        }
      } catch (e) {
        console.warn('updateUser failed', e)
      }

      // Navigate to profile/order after a short delay
      setTimeout(() => {
        navigate('/profile/' + user.id)
      }, 1200)
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error?.response?.data?.message || 'Checkout failed')
    } finally {
      setProcessing(false)
    }
  }

  if (!user) return null

  const cartTotal = getTotalPoints()

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-eco-light mb-2">Redeem Rewards</h1>
          <p className="text-gray-600 dark:text-gray-300">Exchange your carbon credits for eco-friendly products</p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative flex items-center gap-2 px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 transition-colors"
        >
          <ShoppingCartIcon className="w-5 h-5" />
          Cart
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 p-4 rounded-lg mb-8 bg-leaf-50 dark:bg-gray-800">
        <span className="text-lg font-semibold text-leaf-700 dark:text-eco-green">🌿 Your Credits: {userCredits.toLocaleString()} points</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products Grid */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300">No rewards available</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {rewards.map(reward => (
                <div key={reward.id} className="card hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-leaf-100 to-leaf-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {reward.image_url ? (
                      <img
                        src={reward.image_url}
                        alt={reward.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-leaf-600 text-4xl">🎁</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{reward.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{reward.description}</p>
                  <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    {reward.quantity_available === 'unlimited'
                      ? 'Unlimited stock'
                      : `Only ${reward.quantity_available} left`}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-leaf-600 dark:text-eco-green">{reward.points_required} credits</span>
                    <button
                      onClick={() => addToCart(reward)}
                      disabled={userCredits < reward.points_required}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        userCredits >= reward.points_required
                          ? 'bg-leaf-600 hover:bg-leaf-700 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shopping Cart Sidebar */}
        {showCart && (
          <div className="lg:col-span-1">
            <div className="card sticky top-20">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-gray-100">Shopping Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.reward.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1">{item.reward.name}</h4>
                          <button
                            onClick={() => removeFromCart(item.reward.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{item.reward.points_required} pts each</span>
                          <span className="font-semibold text-leaf-600 dark:text-eco-green">{item.total_points} pts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQuantity(item.reward.id, item.quantity - 1)}
                            className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.reward.id, item.quantity + 1)}
                            className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold dark:text-gray-100">Total:</span>
                      <span className="text-2xl font-bold text-leaf-600 dark:text-eco-green">{cartTotal.toLocaleString()}</span>
                    </div>

                    <div className={`mb-4 p-2 rounded text-sm ${
                      userCredits >= cartTotal
                        ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {userCredits >= cartTotal
                        ? `✓ You have enough credits (${userCredits.toLocaleString()} available)`
                        : `✗ Need ${(cartTotal - userCredits).toLocaleString()} more credits`}
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={!canCheckout() || processing}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                        canCheckout() && !processing
                          ? 'bg-leaf-600 hover:bg-leaf-700 text-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {processing ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
