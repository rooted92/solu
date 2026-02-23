import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center animate-scale-in">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold mb-2">Account Created!</h2>
          <p className="text-gray-400 text-sm mb-6">Check your email to confirm your account, then sign in.</p>
          <button className="btn-primary justify-center w-full" onClick={() => navigate('/login')}>
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent2/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
            <span className="font-display text-2xl font-bold text-accent">S</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-white">solu</h1>
          <p className="text-gray-500 mt-2 text-sm">Start your journey to financial freedom</p>
        </div>

        <div className="card animate-fade-up anim-d1">
          <h2 className="font-display text-xl font-bold mb-6">Create your account</h2>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input-base"
                type="text"
                placeholder="Pedro Castaneda"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
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
                  placeholder="Min. 6 characters"
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="text-center mt-4 pt-4 border-t border-border">
            <button onClick={() => navigate('/login')} className="text-xs text-gray-500 hover:text-accent transition-colors">
              Already have an account? Sign in →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
