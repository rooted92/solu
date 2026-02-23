import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'

export default function PreviousPlans() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    loadArchivedPlans()
  }, [])

  const loadArchivedPlans = async () => {
    setLoading(true)
    const { data: plansData } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'archived')
      .order('completed_at', { ascending: false })

    if (plansData) {
      const plansWithGoals = await Promise.all(
        plansData.map(async plan => {
          const { data: goals } = await supabase.from('goals').select('*').eq('plan_id', plan.id)
          return { ...plan, goals: goals || [] }
        })
      )
      setPlans(plansWithGoals)
    }
    setLoading(false)
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('Permanently delete this archived plan? This cannot be undone.')) return
    setDeleting(planId)
    // Delete payments, goals, then plan (cascade should handle it but let's be safe)
    await supabase.from('payments').delete().eq('plan_id', planId)
    await supabase.from('goals').delete().eq('plan_id', planId)
    await supabase.from('plans').delete().eq('id', planId)
    setPlans(prev => prev.filter(p => p.id !== planId))
    setDeleting(null)
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return
    setDeletingAccount(true)
    try {
      // Delete all user data first
      const { data: allPlans } = await supabase.from('plans').select('id').eq('user_id', user.id)
      if (allPlans) {
        for (const plan of allPlans) {
          await supabase.from('payments').delete().eq('plan_id', plan.id)
          await supabase.from('goals').delete().eq('plan_id', plan.id)
        }
        await supabase.from('plans').delete().eq('user_id', user.id)
      }
      // Sign out — actual user deletion requires Supabase admin API
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      alert('Error deleting account. Please contact support.')
    }
    setDeletingAccount(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading previous plans...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <span className="text-xs font-bold tracking-widest uppercase text-accent">History</span>
        <h1 className="font-display text-4xl font-bold mt-1">Previous Plans</h1>
        <p className="text-gray-500 mt-2 text-sm">A record of everything you've accomplished.</p>
      </div>

      {plans.length === 0 ? (
        <div className="card text-center py-16 animate-fade-up">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="font-display text-2xl font-bold mb-3">No Completed Plans Yet</h2>
          <p className="text-gray-500 text-sm">Completed plans will appear here once you finish your first one. Keep going!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan, i) => (
            <div key={plan.id} className="card animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="badge bg-accent/10 text-accent border border-accent/20">✓ Completed</span>
                    <span className="text-xs text-gray-500">
                      {plan.completed_at ? new Date(plan.completed_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Completed'}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>${plan.monthly_budget?.toLocaleString()}/mo budget</span>
                    <span>{plan.goals?.length} goals</span>
                    <span>${plan.goals?.reduce((a, g) => a + g.amount, 0).toLocaleString()} total</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-gray-500 text-lg cursor-pointer" onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}>
                    {expanded === plan.id ? '▴' : '▾'}
                  </span>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={deleting === plan.id}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg"
                    title="Delete this plan"
                  >
                    {deleting === plan.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>

              {expanded === plan.id && (
                <div className="mt-5 pt-5 border-t border-border animate-fade-in">
                  <div className="label mb-3">Goals Achieved</div>
                  <div className="flex flex-col gap-2">
                    {plan.goals.map((g) => (
                      <div key={g.id} className="flex items-center justify-between bg-surface2 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-accent text-sm">✓</span>
                          <span className="font-medium text-sm">{g.name}</span>
                          <span className={`badge text-xs ${g.type === 'debt' ? 'bg-accent3/10 text-accent3' : 'bg-accent/10 text-accent'}`}>
                            {g.type}
                          </span>
                        </div>
                        <span className="font-display font-bold text-white text-sm">${g.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                    <span className="text-gray-500 text-sm font-medium">Total Cleared</span>
                    <span className="font-display text-xl font-bold text-accent">
                      ${plan.goals.reduce((a, g) => a + g.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-12 animate-fade-up">
        <div className="card border-red-500/20">
          <h3 className="font-display text-lg font-bold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-gray-500 text-sm mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          <button
            className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-all"
            onClick={() => setShowDeleteAccount(true)}
          >
            🗑 Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDeleteAccount(false)}>
          <div className="card max-w-md w-full animate-scale-in border-red-500/30" onClick={e => e.stopPropagation()}>
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
            />
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all disabled:opacity-40"
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'DELETE' || deletingAccount}
              >
                {deletingAccount ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button className="btn-secondary py-3" onClick={() => { setShowDeleteAccount(false); setConfirmText('') }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
