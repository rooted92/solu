import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../App'

export default function PreviousPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)

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
    await supabase.from('payments').delete().eq('plan_id', planId)
    await supabase.from('goals').delete().eq('plan_id', planId)
    await supabase.from('plans').delete().eq('id', planId)
    setPlans(prev => prev.filter(p => p.id !== planId))
    setDeleting(null)
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
    </div>
  )
}
