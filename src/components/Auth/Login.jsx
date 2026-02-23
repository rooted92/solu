import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
            <span className="font-display text-2xl font-bold text-accent">S</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-white">solu</h1>
          <p className="text-gray-500 mt-2 text-sm">Your path to financial freedom</p>
        </div>

        <div className="card animate-fade-up anim-d1">
          {!resetMode ? (
            <>
              <h2 className="font-display text-xl font-bold mb-6">Welcome back</h2>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input-base"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      className="input-base pr-12"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-lg"
                    >
                      {showPass ? '👁' : '🙈'}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
                <button className="btn-primary justify-center py-3 mt-2" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <button onClick={() => setResetMode(true)} className="text-xs text-gray-500 hover:text-accent transition-colors">
                  Forgot password?
                </button>
                <button onClick={() => navigate('/register')} className="text-xs text-gray-500 hover:text-accent transition-colors">
                  Create account →
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setResetMode(false); setResetSent(false); setError('') }} className="text-gray-500 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">
                ← Back to login
              </button>
              <h2 className="font-display text-xl font-bold mb-2">Reset password</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              {resetSent ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">📬</div>
                  <p className="text-accent font-medium">Reset link sent!</p>
                  <p className="text-gray-500 text-sm mt-1">Check your email inbox.</p>
                </div>
              ) : (
                <form onSubmit={handleReset} className="flex flex-col gap-4">
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input-base"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <button className="btn-primary justify-center py-3" type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
