import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p>Sign in to your Document Assistant</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
