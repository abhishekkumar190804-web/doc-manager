import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUp />} />
      <Route path="/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
    </Routes>
  )
}
