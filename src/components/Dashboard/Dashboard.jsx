import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth, usePlan, useToast } from '../../App'
import Celebration from '../shared/Celebration'

const GOAL_COLORS = ['#6ee7b7', '#818cf8', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa']

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activePlan, goals, payments, loadPlanData, calculateSchedule, planLoading } = usePlan()
  const { showToast } = useToast()
  const [celebration, setCelebration] = useState(null)
  const [creatingPlan, setCreatingPlan] = useState(false)

  // New plan form state
  const [newPlan, setNewPlan] = useState({ name: '', monthly_budget: '', start_date: '', end_date: '' })

  const schedule = activePlan ? calculateSchedule(activePlan, goals) : []

  // Calculate progress per goal
  const paidPerGoal = {}
  goals.forEach(g => { paidPerGoal[g.id] = 0 })
  payments.forEach(p => { paidPerGoal[p.goal_id] = (paidPerGoal[p.goal_id] || 0) + p.amount_paid })

  const totalGoal = goals.reduce((a, g) => a + g.amount, 0)
  const totalPaid = Object.values(paidPerGoal).reduce((a, b) => a + b, 0)
  const totalRemaining = totalGoal - totalPaid
  const overallPct = totalGoal ? Math.min(100, Math.round((totalPaid / totalGoal) * 100)) : 0

  const monthsLeft = schedule.filter(row => {
    const allPaid = goals.every(g => {
      const p = payments.find(pay => pay.goal_id === g.id && pay.month_key === row.monthKey)
      return p && p.amount_paid >= (row.alloc[g.id] || 0)
    })
    return !allPaid
  }).length

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    if (!newPlan.name || !newPlan.monthly_budget || !newPlan.start_date || !newPlan.end_date) {
      showToast('Please fill in all fields', 'error')
      return
    }
    setCreatingPlan(true)
    const { error } = await supabase.from('plans').insert({
      user_id: user.id,
      name: newPlan.name,
      monthly_budget: parseFloat(newPlan.monthly_budget),
      start_date: newPlan.start_date,
      end_date: newPlan.end_date,
      status: 'active',
    })
    if (error) { showToast('Error creating plan', 'error'); setCreatingPlan(false); return }
    showToast('Plan created! Now add your goals.')
    await loadPlanData()
    setCreatingPlan(false)
    navigate('/goals')
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  if (planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading your plan...</div>
      </div>
    )
  }

  // ── No active plan → onboarding ───────────────────────
  if (!activePlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-10 animate-fade-up">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="font-display text-4xl font-bold mb-3">Hey {firstName}!</h1>
          <p className="text-gray-400">Let's create your first payment plan and start your journey to financial freedom.</p>
        </div>
        <div className="card animate-fade-up anim-d1">
          <h2 className="font-display text-xl font-bold mb-6">Create Your Plan</h2>
          <form onSubmit={handleCreatePlan} className="flex flex-col gap-5">
            <div>
              <label className="label">Plan Name</label>
              <input className="input-base" placeholder='e.g. "2026 Family Plan"' value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Monthly Budget ($)</label>
              <input className="input-base" type="number" placeholder="e.g. 2500" value={newPlan.monthly_budget} onChange={e => setNewPlan({ ...newPlan, monthly_budget: e.target.value })} />
              <p className="text-xs text-gray-600 mt-1">Total amount you can put toward all goals each month</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Month</label>
                <input className="input-base" type="month" value={newPlan.start_date} onChange={e => setNewPlan({ ...newPlan, start_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Target End Month</label>
                <input className="input-base" type="month" value={newPlan.end_date} onChange={e => setNewPlan({ ...newPlan, end_date: e.target.value })} />
                <p className="text-xs text-gray-600 mt-1">The app will calculate if this is achievable</p>
              </div>
            </div>
            <button className="btn-primary justify-center py-3 mt-2" type="submit" disabled={creatingPlan}>
              {creatingPlan ? 'Creating...' : 'Create Plan & Add Goals →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Active plan dashboard ─────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {celebration && (
        <Celebration
          goalName={celebration.goalName}
          isPlanComplete={celebration.isPlanComplete}
          onClose={() => setCelebration(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <span className="text-xs font-bold tracking-widest uppercase text-accent">Overview</span>
        <h1 className="font-display text-4xl font-bold mt-1">Your Family's<br />Financial Picture</h1>
        <p className="text-gray-500 mt-2 text-sm">{activePlan.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Goal', value: `$${totalGoal.toLocaleString()}`, sub: `${goals.length} goal${goals.length !== 1 ? 's' : ''}`, color: 'accent2' },
          { label: 'Total Paid', value: `$${totalPaid.toLocaleString()}`, sub: `${overallPct}% complete`, color: 'accent', highlight: true },
          { label: 'Remaining', value: `$${totalRemaining.toLocaleString()}`, sub: `${monthsLeft} months left`, color: 'accent3' },
          { label: 'Monthly Budget', value: `$${activePlan.monthly_budget.toLocaleString()}`, sub: `${schedule.length} month plan`, color: 'accent4' },
        ].map((stat, i) => (
          <div key={i} className={`card-sm animate-fade-up anim-d${i + 1}`}>
            <div className="label">{stat.label}</div>
            <div className={`font-display text-2xl font-bold ${stat.highlight ? 'text-accent' : 'text-white'}`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress by goal */}
      <div className="card mb-6 animate-fade-up anim-d2">
        <div className="flex items-center justify-between mb-5">
          <span className="label mb-0">Progress by Goal</span>
          <button onClick={() => navigate('/plan')} className="text-xs text-gray-500 hover:text-accent transition-colors">
            View Payment Plan →
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="mb-3">No goals yet.</p>
            <button className="btn-primary" onClick={() => navigate('/goals')}>+ Add Goals</button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {goals.map((g, i) => {
              const paid = paidPerGoal[g.id] || 0
              const pct = g.amount ? Math.min(100, Math.round((paid / g.amount) * 100)) : 0
              const color = GOAL_COLORS[i % GOAL_COLORS.length]
              return (
                <div key={g.id}>
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                      <span className="text-sm font-medium" style={{ color }}>{g.name}</span>
                      <span className={`badge text-xs ${g.type === 'debt' ? 'bg-accent3/10 text-accent3' : 'bg-accent/10 text-accent'}`}>
                        {g.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-display">
                      ${paid.toLocaleString()} / ${g.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-surface3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full progress-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-600 mt-1">{pct}%</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card animate-fade-up anim-d3">
        <span className="label">Quick Actions</span>
        <div className="flex flex-wrap gap-3 mt-1">
          <button className="btn-primary" onClick={() => navigate('/goals')}>+ Add Debt / Goal</button>
          <button className="btn-secondary" onClick={() => navigate('/plan')}>View Payment Plan →</button>
          <button className="btn-secondary" onClick={() => window.print()}>⎙ Print / PDF</button>
        </div>
      </div>
    </div>
  )
}
