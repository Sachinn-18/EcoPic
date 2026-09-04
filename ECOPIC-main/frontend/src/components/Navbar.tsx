import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SparklesIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api/client';
import toast from 'react-hot-toast';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  /* -------------------------------- */
  /* THEME */
  /* -------------------------------- */
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const credits = user?.carbon_credits ?? 0;

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      logout();
      toast.success('Logged out');
      navigate('/');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  /* -------------------------------- */
  /* SLIDING PILL ANIMATION LOGIC */
  /* -------------------------------- */
  const refs = {
    home: useRef<HTMLAnchorElement | null>(null),
    discover: useRef<HTMLAnchorElement | null>(null),
    create: useRef<HTMLAnchorElement | null>(null),
    redeem: useRef<HTMLAnchorElement | null>(null),
  };

  const [pillX, setPillX] = useState(0);
  const [pillW, setPillW] = useState(0);

  useEffect(() => {
    const activeRef =
      isActive('/') ? refs.home :
      isActive('/feed') ? refs.discover :
      isActive('/create') ? refs.create :
      isActive('/redeem') ? refs.redeem : null;

    if (activeRef?.current) {
      const el = activeRef.current;
      setPillX(el.offsetLeft);
      setPillW(el.offsetWidth);
    }
  }, [location.pathname]);

  /* -------------------------------- */
  /* RENDER */
  /* -------------------------------- */
  return (
    <nav className="navbar glass border-b border-white/10 dark:border-white/5 shadow-md backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <SparklesIcon className="h-8 w-8 text-leaf-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">ecopic</span>
          </Link>

          {/* NAV LINKS + SLIDING PILL */}
          <div className="hidden md:flex relative items-center nav-pill-container space-x-6">

            {/* sliding background highlight */}
            <div
              className="nav-pill-slider"
              style={{
                width: pillW,
                transform: `translateX(${pillX}px)`,
              }}
            />

            <Link
              ref={refs.home}
              to="/"
              className={`nav-pill ${isActive('/') ? 'active' : ''}`}
            >
              Your Feed
            </Link>

            <Link
              ref={refs.discover}
              to="/feed"
              className={`nav-pill ${isActive('/feed') ? 'active' : ''}`}
            >
              Discover
            </Link>

            <Link
              ref={refs.create}
              to="/create"
              className={`nav-pill ${isActive('/create') ? 'active' : ''}`}
            >
              Create Post
            </Link>

            <Link
              ref={refs.redeem}
              to="/redeem"
              className={`nav-pill ${isActive('/redeem') ? 'active' : ''}`}
            >
              Redeem
            </Link>
          </div>

          {/* Right Side: Theme, Profile, Login */}
          <div className="flex items-center space-x-4">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark'
                ? <SunIcon className="h-5 w-5 text-yellow-400" />
                : <MoonIcon className="h-5 w-5 text-gray-700" />}
            </button>

            {isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center text-sm text-gray-700 dark:text-gray-300 gap-1">
                  🌿
                  <span>Credits:</span>
                  <span className="font-semibold text-leaf-600 dark:text-leaf-400">
                    {credits.toLocaleString()}
                  </span>
                </div>



                {/* Profile Dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-leaf-600 py-2">
                    <UserCircleIcon className="h-6 w-6" />
                    <span className="hidden md:block truncate max-w-[10rem]">{user.username}</span>
                  </button>

                  <div className="absolute right-0 top-full mt-1 w-48 glass rounded-md shadow-xl py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-white/10">
                    <Link
                      to={`/profile/${user.id}`}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-white/20"
                    >
                      Profile
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-white/20"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-700 dark:text-gray-200 hover:text-leaf-500">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
