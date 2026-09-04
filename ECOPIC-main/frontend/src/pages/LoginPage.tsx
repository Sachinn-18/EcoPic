import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../api/client'
import toast from 'react-hot-toast'
import { LoginData } from '../types'

const WELCOME_MESSAGES = [
  'Share your eco wins 🌿',
  'Earn credits for real-world action',
  'Discover local sustainability projects',
  'Connect with other eco-minded people'
]

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, setLoading, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'show-register'>('login')
  const [welcomeIdx, setWelcomeIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setWelcomeIdx(i => (i + 1) % WELCOME_MESSAGES.length), 4500)
    return () => clearInterval(t)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>()

  const onSubmit = async (data: LoginData) => {
    try {
      setLoading(true)
      const response = await authAPI.login(data)
      login(response.user, response.access_token, response.refresh_token)
      toast.success(`Welcome back, ${response.user.username}!`)
      navigate('/')
    } catch (error: any) {
      console.error('Login failed:', error)
      // API client interceptor handles error toast if configured
    } finally {
      setLoading(false)
    }
  }

  // UI toggles
  const showRegisterPanel = () => setMode('show-register')
  const showLoginPanel = () => setMode('login')

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Login form / or Register prompt when toggled */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                Sign in — Ecopic
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
                Join the eco-friendly community
              </p>
            </div>

            {mode === 'show-register' ? (
              <div className="card p-6 transition-all duration-500 transform scale-100">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Create an account</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Start sharing eco actions, earn credits, and connect with your local community.</p>
                <div className="flex gap-3">
                  <Link to="/register" className="btn-primary flex-1 text-center">
                    Go to Register
                  </Link>
                  <button onClick={showLoginPanel} className="btn-secondary px-4">
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4 bg-transparent">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Email address
                    </label>
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      type="email"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm bg-white dark:bg-gray-800"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                        type={showPassword ? 'text' : 'password'}
                        className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-leaf-500 focus:border-leaf-500 sm:text-sm bg-white dark:bg-gray-800"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-leaf-600 hover:bg-leaf-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-leaf-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Signing in...
                      </div>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={showRegisterPanel}
                      className="font-medium text-leaf-600 hover:text-leaf-500"
                      aria-label="Switch to register welcome"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT: Welcome / rotating messages column */}
        <div className="hidden md:flex items-center justify-center">
          <div className="w-full max-w-md relative">
            <div className="card p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-leaf-500 to-leaf-400 flex items-center justify-center text-white font-bold">E</div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ecopic</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">Eco Action Community</div>
                  </div>
                </div>

                <div>
                  <Link to="/register" className="text-sm text-gray-600 dark:text-gray-300 hover:text-leaf-600">
                    Create account
                  </Link>
                </div>
              </div>

              <div className="h-40 flex items-center">
                <div className="w-full">
                  {mode === 'login' ? (
                    <div className="transition-opacity duration-700 ease-in-out opacity-100">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{WELCOME_MESSAGES[welcomeIdx]}</h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Ecopic helps you track, share and reward everyday sustainability. Earn credits, join challenges, and meet your local community.
                      </p>
                    </div>
                  ) : (
                    <div className="transition-transform duration-500 transform translate-y-0">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create your account</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">Sign up to start posting and earning credits for your eco actions.</p>
                      <div className="flex gap-3">
                        <Link to="/register" className="btn-primary flex-1 text-center">
                          Go to Register
                        </Link>
                        <button onClick={showLoginPanel} className="btn-secondary">
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                By signing in you agree to the community guidelines and to use the platform for positive environmental actions.
              </div>
            </div>

            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br from-leaf-300 to-leaf-600 opacity-20 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
