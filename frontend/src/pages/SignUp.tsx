import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signUp(email, password)
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Check your email</h2>
          <p>We sent a confirmation link to {email}. After confirming, you can sign in.</p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Create account</h2>
        <p>Start managing your documents</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
