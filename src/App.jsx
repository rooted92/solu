import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import Dashboard from './components/Dashboard/Dashboard'
import Goals from './components/Goals/Goals'
import PaymentPlan from './components/Plan/PaymentPlan'
import PreviousPlans from './components/PreviousPlans/PreviousPlans'
import Navbar from './components/shared/Navbar'
import Toast from './components/shared/Toast'

// ── Auth Context ──────────────────────────────────────────
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// ── Toast Context ─────────────────────────────────────────
export const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

// ── Plan Context ──────────────────────────────────────────
export const PlanContext = createContext(null)
export const usePlan = () => useContext(PlanContext)

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [activePlan, setActivePlan] = useState(null)
  const [goals, setGoals] = useState([])
  const [payments, setPayments] = useState([])
  const [planLoading, setPlanLoading] = useState(false)

  // ── Auth listener ─────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load plan data when user logs in ─────────────────
  useEffect(() => {
    if (user) loadPlanData()
    else {
      setActivePlan(null)
      setGoals([])
      setPayments([])
    }
  }, [user])

  const loadPlanData = async () => {
    setPlanLoading(true)
    try {
      // Load active plan
      const { data: plans } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        const plan = plans[0]
        setActivePlan(plan)

        // Load goals for this plan
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('plan_id', plan.id)
          .order('priority', { ascending: true })

        setGoals(goalsData || [])

        // Load payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('plan_id', plan.id)

        setPayments(paymentsData || [])
      }
    } catch (err) {
      console.error('Error loading plan data:', err)
    } finally {
      setPlanLoading(false)
    }
  }

  // ── Toast helper ──────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Calculate payment schedule ────────────────────────
  const calculateSchedule = (plan, goalsList) => {
  if (!plan || !goalsList.length) return []

  const budget = plan.monthly_budget
  const [startYear, startMonth] = plan.start_date.split('-').map(Number)

  const debtGoals = goalsList
    .filter(g => g.type === 'debt')
    .sort((a, b) => a.priority - b.priority)
  const savingsGoals = goalsList
    .filter(g => g.type === 'savings')

  let remaining = {}
  goalsList.forEach(g => { remaining[g.id] = g.amount })

  payments.forEach(p => {
    if (remaining[p.goal_id] !== undefined) {
      remaining[p.goal_id] = Math.max(0, remaining[p.goal_id] - p.amount_paid)
    }
  })

  const schedule = []
  let monthOffset = 0
  const MAX_MONTHS = 120

  while (monthOffset < MAX_MONTHS) {
    const allDone = goalsList.every(g => remaining[g.id] <= 0)
    if (allDone) break

    const totalMonth = startMonth + monthOffset - 1
    const year = startYear + Math.floor(totalMonth / 12)
    const month = (totalMonth % 12) + 1
    const monthKey = `${year}-${String(month).padStart(2, '0')}`

    const alloc = {}
    goalsList.forEach(g => alloc[g.id] = 0)

    let leftover = budget
    const activeDebt = debtGoals.find(g => remaining[g.id] > 0)
    const activeSavings = savingsGoals.filter(g => remaining[g.id] > 0)

    if (activeDebt) {
      // Pay off debt fully if possible, otherwise pay as much as possible
      // leaving at least $0 for savings (debt gets priority)
      const savingsMin = activeSavings.length > 0 ? Math.min(leftover * 0.25, 500) : 0
      const debtPayment = Math.min(remaining[activeDebt.id], leftover - savingsMin)
      alloc[activeDebt.id] = Math.round(debtPayment)
      leftover -= alloc[activeDebt.id]
    }

    // Distribute leftover evenly among active savings goals
    if (activeSavings.length > 0 && leftover > 0) {
      const share = Math.floor(leftover / activeSavings.length)
      let extra = leftover - (share * activeSavings.length)
      activeSavings.forEach(g => {
        const give = Math.min(remaining[g.id], share + extra)
        alloc[g.id] = Math.round(give)
        extra = 0
      })
    }

    goalsList.forEach(g => {
      remaining[g.id] = Math.max(0, remaining[g.id] - alloc[g.id])
    })

    schedule.push({ monthKey, alloc, remainingSnap: { ...remaining } })
    monthOffset++
  }

  return schedule
}

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-display font-bold text-accent mb-3">Solu</div>
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <ToastContext.Provider value={{ showToast }}>
        <PlanContext.Provider value={{ activePlan, setActivePlan, goals, setGoals, payments, setPayments, loadPlanData, calculateSchedule, planLoading }}>
          <div className="min-h-screen bg-bg glow-bg">
            {user && <Navbar />}
            <main className={user ? 'pt-16' : ''}>
              <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/goals" element={user ? <Goals /> : <Navigate to="/login" />} />
                <Route path="/plan" element={user ? <PaymentPlan /> : <Navigate to="/login" />} />
                <Route path="/previous" element={user ? <PreviousPlans /> : <Navigate to="/login" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} />}
          </div>
        </PlanContext.Provider>
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}
