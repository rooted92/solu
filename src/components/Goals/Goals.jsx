import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth, usePlan, useToast } from '../../App'

const GOAL_COLORS = ['#6ee7b7', '#818cf8', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa']

export default function Goals() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activePlan, goals, setGoals, loadPlanData } = usePlan()
  const { showToast } = useToast()

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ name: '', amount: '', type: 'debt', priority: '' })

  // Draft states for budget fields
  const [budgetDraft, setBudgetDraft] = useState(activePlan?.monthly_budget ?? '')
  const [startDraft, setStartDraft] = useState(activePlan?.start_date ?? '')
  const [endDraft, setEndDraft] = useState(activePlan?.end_date ?? '')
  const [goalDrafts, setGoalDrafts] = useState({})

  if (!activePlan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h2 className="font-display text-2xl font-bold mb-3">No Active Plan</h2>
        <p className="text-gray-500 mb-6">Create a plan first before adding goals.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Create a Plan →</button>
      </div>
    )
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!form.name || !form.amount) { showToast('Please fill in name and amount', 'error'); return }
    setSaving(true)
    const priority = parseInt(form.priority) || goals.filter(g => g.type === 'debt').length + 1
    const { error } = await supabase.from('goals').insert({
      plan_id: activePlan.id,
      user_id: user.id,
      name: form.name,
      amount: parseFloat(form.amount),
      type: form.type,
      priority,
    })
    if (error) { showToast('Error adding goal', 'error') }
    else {
      showToast('✓ Goal added!')
      setForm({ name: '', amount: '', type: 'debt', priority: '' })
      setShowModal(false)
      await loadPlanData()
    }
    setSaving(false)
  }

  const handleDelete = async (goalId) => {
    if (!confirm('Remove this goal from your plan?')) return
    setDeleting(goalId)
    await supabase.from('goals').delete().eq('id', goalId)
    await loadPlanData()
    showToast('Goal removed.')
    setDeleting(null)
  }

  const handleUpdateGoal = async (goalId, updates) => {
    await supabase.from('goals').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', goalId)
    setGoalDrafts(prev => {
      const next = { ...prev }
      delete next[goalId]
      return next
    })
    await loadPlanData()
    showToast('✓ Goal saved!')
  }

  const handleUpdatePlan = async (updates) => {
    await supabase.from('plans').update(updates).eq('id', activePlan.id)
    await loadPlanData()
    showToast('✓ Plan updated!')
  }

  const getGoalDraft = (goalId, field, fallback) => {
    return goalDrafts[goalId]?.[field] ?? fallback
  }

  const setGoalDraft = (goalId, field, value) => {
    setGoalDrafts(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], [field]: value }
    }))
  }

  const hasGoalChanges = (g) => {
    const d = goalDrafts[g.id]
    if (!d) return false
    return (d.name !== undefined && d.name !== g.name) ||
           (d.amount !== undefined && parseFloat(d.amount) !== g.amount)
  }

  // Budget change detection
  const budgetChanged = parseFloat(budgetDraft) !== activePlan.monthly_budget
  const startChanged = startDraft !== activePlan.start_date
  const endChanged = endDraft !== activePlan.end_date
  const planHasChanges = budgetChanged || startChanged || endChanged

  // Calculate projected completion
  const totalGoal = goals.reduce((a, g) => a + g.amount, 0)
  const monthsNeeded = activePlan.monthly_budget ? Math.ceil(totalGoal / activePlan.monthly_budget) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <span className="text-xs font-bold tracking-widest uppercase text-accent">Setup</span>
        <h1 className="font-display text-4xl font-bold mt-1">Goals & Budget</h1>
        <p className="text-gray-500 mt-2 text-sm">Add, edit, or remove debts and savings goals.</p>
      </div>

      {/* Budget & Timeline */}
      <div className="card mb-6 animate-fade-up anim-d1">
        <div className="flex items-center justify-between mb-3">
          <span className="label mb-0">Budget & Timeline</span>
          {planHasChanges && (
            <button
              className="btn-primary text-xs py-2 px-4 animate-fade-in"
              onClick={() => handleUpdatePlan({
                monthly_budget: parseFloat(budgetDraft),
                start_date: startDraft,
                end_date: endDraft,
              })}
            >
              💾 Save Changes
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className={`card-sm transition-all ${budgetChanged ? 'border-accent/40 bg-accent/5' : ''}`}>
            <div className="label">Monthly Budget</div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                className="bg-transparent outline-none font-display text-2xl font-bold text-white w-full"
                type="number"
                value={budgetDraft}
                onChange={e => setBudgetDraft(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">Per month across all goals</div>
            {budgetChanged && <div className="text-xs text-accent mt-1">● Unsaved change</div>}
          </div>
          <div className={`card-sm transition-all ${startChanged ? 'border-accent/40 bg-accent/5' : ''}`}>
            <div className="label">Plan Start</div>
            <input
              className="bg-transparent outline-none text-white w-full text-sm"
              type="month"
              value={startDraft}
              onChange={e => setStartDraft(e.target.value)}
            />
            {startChanged && <div className="text-xs text-accent mt-1">● Unsaved change</div>}
          </div>
          <div className={`card-sm transition-all ${endChanged ? 'border-accent/40 bg-accent/5' : ''}`}>
            <div className="label">Target End</div>
            <input
              className="bg-transparent outline-none text-white w-full text-sm"
              type="month"
              value={endDraft}
              onChange={e => setEndDraft(e.target.value)}
            />
            {monthsNeeded && (
              <div className="text-xs text-gray-600 mt-1">
                ~{monthsNeeded} months needed at current budget
              </div>
            )}
            {endChanged && <div className="text-xs text-accent mt-1">● Unsaved change</div>}
          </div>
        </div>
      </div>

      {/* Goals list */}
      <div className="card animate-fade-up anim-d2">
        <div className="flex items-center justify-between mb-5">
          <span className="label mb-0">Debts & Savings Goals</span>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add New</button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <div className="text-3xl mb-3">🎯</div>
            <p className="mb-4">No goals yet. Add your first debt or savings goal!</p>
            <button className="btn-secondary" onClick={() => setShowModal(true)}>+ Add Goal</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...goals].sort((a, b) => a.priority - b.priority).map((g, i) => {
              const isDirty = hasGoalChanges(g)
              return (
                <div
                  key={g.id}
                  className={`bg-surface2 border rounded-xl p-4 relative overflow-hidden transition-all ${isDirty ? 'border-accent/40' : 'border-border'}`}
                  style={{ borderLeft: `3px solid ${GOAL_COLORS[i % GOAL_COLORS.length]}` }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div>
                      <div className="label">Name</div>
                      <input
                        className="bg-transparent outline-none text-white font-medium w-full border-b border-transparent focus:border-accent/50 pb-1 transition-colors"
                        value={getGoalDraft(g.id, 'name', g.name)}
                        onChange={e => setGoalDraft(g.id, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="label">Amount ($)</div>
                      <input
                        className="bg-transparent outline-none text-white font-display text-lg font-bold w-full border-b border-transparent focus:border-accent/50 pb-1 transition-colors"
                        type="number"
                        value={getGoalDraft(g.id, 'amount', g.amount)}
                        onChange={e => setGoalDraft(g.id, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="label">Type</div>
                        <button
                          className={`badge text-xs cursor-pointer ${g.type === 'debt' ? 'bg-accent3/10 text-accent3 border border-accent3/20' : 'bg-accent/10 text-accent border border-accent/20'}`}
                          onClick={() => handleUpdateGoal(g.id, { type: g.type === 'debt' ? 'savings' : 'debt' })}
                        >
                          {g.type === 'debt' ? '💳 Debt' : '🏦 Savings'}
                        </button>
                      </div>
                      <button
                        className="text-gray-600 hover:text-red-400 transition-colors text-lg"
                        onClick={() => handleDelete(g.id)}
                        disabled={deleting === g.id}
                      >
                        {deleting === g.id ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-gray-600">
                      Last updated: {new Date(g.updated_at || g.created_at).toLocaleDateString()}
                    </div>
                    {isDirty && (
                      <button
                        className="btn-primary text-xs py-1.5 px-3 animate-fade-in"
                        onClick={() => handleUpdateGoal(g.id, {
                          name: getGoalDraft(g.id, 'name', g.name),
                          amount: parseFloat(getGoalDraft(g.id, 'amount', g.amount)),
                        })}
                      >
                        💾 Save
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex gap-3 mt-5 pt-5 border-t border-border">
          <button className="btn-primary" onClick={() => navigate('/plan')}>View Payment Plan →</button>
          <button className="btn-secondary" onClick={() => navigate('/')}>← Dashboard</button>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="card max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-xl font-bold mb-2">Add New Goal</h2>
            <p className="text-gray-500 text-sm mb-6">Add a debt or savings goal to your plan.</p>
            <form onSubmit={handleAddGoal} className="flex flex-col gap-4">
              {/* Type toggle */}
              <div>
                <div className="label">Type</div>
                <div className="flex gap-2">
                  {['debt', 'savings'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        form.type === t
                          ? t === 'debt'
                            ? 'border-accent3/50 text-accent3 bg-accent3/10'
                            : 'border-accent/50 text-accent bg-accent/10'
                          : 'border-border text-gray-500 bg-surface2'
                      }`}
                    >
                      {t === 'debt' ? '💳 Debt / Repayment' : '🏦 Savings Goal'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Name</label>
                <input className="input-base" placeholder="e.g. Car Loan, Vacation Fund" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Total Amount ($)</label>
                <input className="input-base" type="number" placeholder="e.g. 5000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" />
              </div>
              {form.type === 'debt' && (
                <div>
                  <label className="label">Priority <span className="text-gray-600 normal-case tracking-normal">(1 = paid first)</span></label>
                  <input className="input-base" type="number" placeholder={`e.g. ${goals.filter(g => g.type === 'debt').length + 1}`} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} min="1" />
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button className="btn-primary flex-1 justify-center" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Goal'}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
