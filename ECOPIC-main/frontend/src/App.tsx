import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import DiscoverFeedPage from './pages/DiscoverFeedPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PostCreatePage from './pages/PostCreatePage'
import UserProfilePage from './pages/UserProfilePage'
import RedeemPage from './pages/RedeemPage'
import PostDetailPage from './pages/PostDetailPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/feed" element={<DiscoverFeedPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/create" element={<PostCreatePage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/profile/:id" element={<UserProfilePage />} />
            <Route path="/redeem" element={<RedeemPage />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App
