import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, accessToken: string, refreshToken?: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      /* ---------------- LOGIN ---------------- */
      login: (user: User, accessToken: string, refreshToken?: string) => {
        // ensure credits are always numeric
        const safeUser = {
          ...user,
          carbon_credits: Number(user.carbon_credits ?? 0),
        }

        localStorage.setItem('auth_token', accessToken)
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken)
        }

        set({
          user: safeUser,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      /* ---------------- LOGOUT ---------------- */
      logout: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      /* ---------------- UPDATE USER (FIXED) ---------------- */
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user
        if (!currentUser) return

        const safeUpdates: Partial<User> = { ...updates }

        // FORCE carbon_credits to always be numeric
        if (safeUpdates.carbon_credits !== undefined) {
          safeUpdates.carbon_credits = Number(safeUpdates.carbon_credits)
        }

        set({
          user: {
            ...currentUser,
            ...safeUpdates,
          },
        })
      },

      /* ---------------- LOADING ---------------- */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),

    /* ---------------- PERSIST ---------------- */
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
