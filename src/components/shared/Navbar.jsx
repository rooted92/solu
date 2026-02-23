import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth, usePlan } from '../../App'

const NAV_LINKS = [
  { path: '/', label: 'Dashboard' },
  { path: '/goals', label: 'Goals & Budget' },
  { path: '/plan', label: 'Payment Plan' },
  { path: '/previous', label: 'Previous Plans' },
]

export default function Navbar() {
  const { user } = useAuth()
  const { setActivePlan, setGoals, setPayments } = usePlan()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return
    setDeletingAccount(true)
    try {
      const { data: allPlans } = await supabase.from('plans').select('id').eq('user_id', user.id)
      if (allPlans) {
        for (const plan of allPlans) {
          await supabase.from('payments').delete().eq('plan_id', plan.id)
          await supabase.from('goals').delete().eq('plan_id', plan.id)
        }
        await supabase.from('plans').delete().eq('user_id', user.id)
      }
      setActivePlan(null)
      setGoals([])
      setPayments([])
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      alert('Error deleting account. Please try again.')
    }
    setDeletingAccount(false)
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'You'

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="font-display text-xl font-bold text-accent cursor-pointer tracking-tight"
            onClick={() => navigate('/')}
          >
            Solu
          </div>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? 'bg-surface2 text-accent border border-accent/20'
                    : 'text-gray-400 hover:text-white hover:bg-surface2'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setDropOpen(!dropOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface2 border border-border hover:border-accent/30 transition-all text-sm font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
                  {firstName[0].toUpperCase()}
                </div>
                {firstName}
                <span className="text-gray-500 text-xs">▾</span>
              </button>
              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-surface2 transition-colors"
                  >
                    Sign out
                  </button>
                  <div className="border-t border-border">
                    <button
                      onClick={() => { setDropOpen(false); setShowDeleteAccount(true) }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      🗑 Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-surface px-4 py-3 flex flex-col gap-1 animate-fade-in">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                onClick={() => { navigate(link.path); setMenuOpen(false) }}
                className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'bg-surface2 text-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="border-t border-border mt-2 pt-2">
              <div className="px-4 py-2 text-xs text-gray-500">{user?.email}</div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-gray-400 hover:bg-surface2 rounded-lg"
              >
                Sign out
              </button>
              <button
                onClick={() => { setMenuOpen(false); setShowDeleteAccount(true) }}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
              >
                🗑 Delete Account
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => { setShowDeleteAccount(false); setConfirmText('') }}>
          <div className="bg-surface border border-red-500/30 rounded-2xl p-6 max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">⚠️</div>
            <h2 className="font-display text-xl font-bold text-red-400 mb-2">Delete Account</h2>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently delete all your plans, goals, payments, and account data. <strong className="text-white">This cannot be undone.</strong>
            </p>
            <p className="text-gray-500 text-xs mb-3">Type <strong className="text-white">DELETE</strong> to confirm:</p>
            <input
              className="input-base mb-4"
              placeholder="Type DELETE to confirm"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all disabled:opacity-40"
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'DELETE' || deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button
                className="btn-secondary py-3"
                onClick={() => { setShowDeleteAccount(false); setConfirmText('') }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
