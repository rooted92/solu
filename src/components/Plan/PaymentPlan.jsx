import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth, usePlan, useToast } from '../../App'
import Celebration from '../shared/Celebration'

const GOAL_COLORS = ['#6ee7b7', '#818cf8', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function PaymentPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activePlan, goals, payments, loadPlanData, calculateSchedule, setActivePlan, setGoals, setPayments } = usePlan()
  const { showToast } = useToast()
  const [celebration, setCelebration] = useState(null)
  const [saving, setSaving] = useState({})
  const [archiving, setArchiving] = useState(false)

  if (!activePlan || goals.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h2 className="font-display text-2xl font-bold mb-3">No Plan Yet</h2>
        <p className="text-gray-500 mb-6">Set up your goals and budget first to generate a payment schedule.</p>
        <button className="btn-primary" onClick={() => navigate('/goals')}>Set Up Goals →</button>
      </div>
    )
  }

  const handleArchive = async () => {
    if (!activePlan) return
    setArchiving(true)
    try {
      // Archive the plan
      await supabase.from('plans').update({
        status: 'archived',
        completed_at: new Date().toISOString(),
      }).eq('id', activePlan.id)

      // Clear local state so all pages reset
      setActivePlan(null)
      setGoals([])
      setPayments([])
      setCelebration(null)

      showToast('🏆 Plan archived! Starting fresh.')
      navigate('/')
    } catch (err) {
      showToast('Error archiving plan', 'error')
    }
    setArchiving(false)
  }

  const schedule = calculateSchedule(activePlan, goals)

  // Helper: get payment for a specific goal + month
  const getPayment = (goalId, monthKey) =>
    payments.find(p => p.goal_id === goalId && p.month_key === monthKey)

  // Is a goal fully paid for a month?
  const isGoalPaidForMonth = (goalId, monthKey, scheduledAmount) => {
    const p = getPayment(goalId, monthKey)
    return p && p.is_checked
  }

  // Is whole month done?
  const isMonthComplete = (row) =>
    goals.every(g => (row.alloc[g.id] || 0) === 0 || isGoalPaidForMonth(g.id, row.monthKey, row.alloc[g.id]))

  const handleCheck = async (goalId, monthKey, scheduledAmount, checked) => {
    const key = `${goalId}-${monthKey}`
    setSaving(s => ({ ...s, [key]: true }))
    const existing = getPayment(goalId, monthKey)

    if (existing) {
      await supabase.from('payments').update({
        is_checked: checked,
        amount_paid: checked ? scheduledAmount : 0,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('payments').insert({
        plan_id: activePlan.id,
        goal_id: goalId,
        user_id: user.id,
        month_key: monthKey,
        scheduled_amount: scheduledAmount,
        amount_paid: checked ? scheduledAmount : 0,
        is_checked: checked,
      })
    }

    await loadPlanData()
    setSaving(s => ({ ...s, [key]: false }))

    // Check if goal is fully paid
    if (checked) {
      const goal = goals.find(g => g.id === goalId)
      const allPaidForGoal = schedule.every(row => {
        if ((row.alloc[goalId] || 0) === 0) return true
        const p = getPayment(goalId, row.monthKey)
        return (row.monthKey === monthKey) ? true : (p && p.is_checked)
      })
      if (allPaidForGoal && goal) {
        // Check if ALL goals are done
        const allDone = goals.every(g => {
          return schedule.every(row => {
            if ((row.alloc[g.id] || 0) === 0) return true
            if (g.id === goalId) return true
            const p = getPayment(g.id, row.monthKey)
            return p && p.is_checked
          })
        })
        setCelebration({ goalName: goal.name, isPlanComplete: allDone })
      }
    }
  }

  const handlePartialPayment = async (goalId, monthKey, scheduledAmount, actualAmount) => {
    const key = `${goalId}-${monthKey}`
    setSaving(s => ({ ...s, [key]: true }))
    const existing = getPayment(goalId, monthKey)
    const paid = parseFloat(actualAmount) || 0

    if (existing) {
      await supabase.from('payments').update({
        amount_paid: paid,
        is_checked: paid >= scheduledAmount,
        is_partial: paid > 0 && paid < scheduledAmount,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('payments').insert({
        plan_id: activePlan.id,
        goal_id: goalId,
        user_id: user.id,
        month_key: monthKey,
        scheduled_amount: scheduledAmount,
        amount_paid: paid,
        is_checked: paid >= scheduledAmount,
        is_partial: paid > 0 && paid < scheduledAmount,
      })
    }
    await loadPlanData()
    showToast('✓ Payment recorded')
    setSaving(s => ({ ...s, [key]: false }))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {celebration && (
        <Celebration
          goalName={celebration.goalName}
          isPlanComplete={celebration.isPlanComplete}
          onClose={() => setCelebration(null)}
          onArchive={handleArchive}
        />
      )}

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <span className="text-xs font-bold tracking-widest uppercase text-accent">Schedule</span>
        <h1 className="font-display text-4xl font-bold mt-1">Month-by-Month Plan</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Check off each goal as you pay it. Log partial payments if needed.
        </p>
      </div>

      <div className="card animate-fade-up anim-d1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <span className="label mb-0">Payment Schedule</span>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm text-xs py-2 px-3" onClick={() => window.print()}>⎙ Print</button>
            <button className="btn-secondary btn-sm text-xs py-2 px-3" onClick={() => { loadPlanData(); showToast('↻ Refreshed') }}>↻ Refresh</button>
          </div>
        </div>

        {/* ── DESKTOP TABLE (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-xs font-bold tracking-widest uppercase text-gray-600">Month</th>
                {goals.map((g, i) => (
                  <th key={g.id} className="text-left py-3 px-3 text-xs font-bold tracking-widest uppercase" style={{ color: GOAL_COLORS[i % GOAL_COLORS.length] }}>
                    {g.name}
                  </th>
                ))}
                <th className="text-left py-3 px-3 text-xs font-bold tracking-widest uppercase text-gray-600">Total</th>
                <th className="text-left py-3 px-3 text-xs font-bold tracking-widest uppercase text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => {
                const monthComplete = isMonthComplete(row)
                const [year, month] = row.monthKey.split('-')
                const monthName = `${MONTHS_LONG[parseInt(month) - 1]} ${year}`
                const total = goals.reduce((a, g) => a + (row.alloc[g.id] || 0), 0)

                return (
                  <tr
                    key={row.monthKey}
                    className={`border-b border-border/50 transition-all ${monthComplete ? 'opacity-50' : 'hover:bg-surface2/50'}`}
                  >
                    <td className="py-4 px-3">
                      <span className={`font-display font-bold text-sm ${monthComplete ? 'line-through text-gray-600' : 'text-white'}`}>
                        {monthName}
                      </span>
                    </td>
                    {goals.map((g, i) => {
                      const scheduled = row.alloc[g.id] || 0
                      const payment = getPayment(g.id, row.monthKey)
                      const isChecked = payment?.is_checked || false
                      const isPartial = payment?.is_partial || false
                      const amountPaid = payment?.amount_paid || 0
                      const key = `${g.id}-${row.monthKey}`
                      const color = GOAL_COLORS[i % GOAL_COLORS.length]
                      if (scheduled === 0) return <td key={g.id} className="py-4 px-3 text-gray-700">—</td>
                      return (
                        <td key={g.id} className="py-4 px-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={isChecked} onChange={e => handleCheck(g.id, row.monthKey, scheduled, e.target.checked)} className="w-4 h-4 cursor-pointer accent-emerald-400" disabled={saving[key]} />
                              <span className={`font-medium ${isChecked ? 'line-through text-gray-600' : ''}`} style={{ color: isChecked ? undefined : color }}>
                                ${scheduled.toLocaleString()}
                              </span>
                              {isPartial && <span className="badge bg-accent4/10 text-accent4 text-xs">partial</span>}
                            </div>
                            {!isChecked && (
                              <input type="number" placeholder="Actual paid" defaultValue={amountPaid || ''} onBlur={e => { const val = parseFloat(e.target.value); if (!isNaN(val) && val !== amountPaid) handlePartialPayment(g.id, row.monthKey, scheduled, val) }} className="w-24 bg-surface3 border border-border rounded px-2 py-1 text-xs text-gray-400 outline-none focus:border-accent/50" />
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="py-4 px-3"><span className="font-display font-bold text-white">${total.toLocaleString()}</span></td>
                    <td className="py-4 px-3">
                      {monthComplete
                        ? <span className="badge bg-accent/10 text-accent border border-accent/20">✓ Done</span>
                        : <span className="badge bg-surface3 text-gray-500 border border-border">Pending</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE CARDS (below md) ── */}
        <div className="md:hidden flex flex-col gap-4">
          {schedule.map((row) => {
            const monthComplete = isMonthComplete(row)
            const [year, month] = row.monthKey.split('-')
            const monthName = `${MONTHS_LONG[parseInt(month) - 1]} ${year}`
            const total = goals.reduce((a, g) => a + (row.alloc[g.id] || 0), 0)
            const activeGoals = goals.filter(g => (row.alloc[g.id] || 0) > 0)

            return (
              <div
                key={row.monthKey}
                className={`rounded-xl border transition-all overflow-hidden ${monthComplete ? 'opacity-50 border-border' : 'border-border hover:border-border2'}`}
                style={{ background: 'var(--surface2, #161624)' }}
              >
                {/* Month header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className={`font-display font-bold text-base ${monthComplete ? 'line-through text-gray-500' : 'text-white'}`}>
                    {monthName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-white">${total.toLocaleString()}</span>
                    {monthComplete
                      ? <span className="badge bg-accent/10 text-accent border border-accent/20 text-xs">✓ Done</span>
                      : <span className="badge bg-surface3 text-gray-500 border border-border text-xs">Pending</span>
                    }
                  </div>
                </div>

                {/* Goal rows */}
                <div className="divide-y divide-border/50">
                  {activeGoals.map((g, i) => {
                    const scheduled = row.alloc[g.id] || 0
                    const payment = getPayment(g.id, row.monthKey)
                    const isChecked = payment?.is_checked || false
                    const isPartial = payment?.is_partial || false
                    const amountPaid = payment?.amount_paid || 0
                    const key = `${g.id}-${row.monthKey}`
                    const goalIndex = goals.findIndex(gl => gl.id === g.id)
                    const color = GOAL_COLORS[goalIndex % GOAL_COLORS.length]

                    return (
                      <div key={g.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        {/* Left: checkbox + goal name */}
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => handleCheck(g.id, row.monthKey, scheduled, e.target.checked)}
                            className="w-5 h-5 cursor-pointer flex-shrink-0 accent-emerald-400"
                            disabled={saving[key]}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: color }}
                              />
                              <span className={`text-sm font-medium truncate ${isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                                {g.name}
                              </span>
                              {isPartial && <span className="badge bg-accent4/10 text-accent4 text-xs flex-shrink-0">partial</span>}
                            </div>
                            {/* Partial input */}
                            {!isChecked && (
                              <input
                                type="number"
                                placeholder="Actual paid"
                                defaultValue={amountPaid || ''}
                                onBlur={e => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val) && val !== amountPaid) handlePartialPayment(g.id, row.monthKey, scheduled, val)
                                }}
                                className="mt-1.5 w-32 bg-surface3 border border-border rounded px-2 py-1 text-xs text-gray-400 outline-none focus:border-accent/50"
                              />
                            )}
                          </div>
                        </div>
                        {/* Right: amount */}
                        <span
                          className={`font-display font-bold text-base flex-shrink-0 ${isChecked ? 'line-through text-gray-500' : ''}`}
                          style={{ color: isChecked ? undefined : color }}
                        >
                          ${scheduled.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
