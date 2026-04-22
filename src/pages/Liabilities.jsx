import { useState, useMemo } from 'react'
import {
  HiPlus, HiPencil, HiTrash,
  HiCreditCard, HiBuildingLibrary, HiAcademicCap, HiHome, HiEllipsisHorizontalCircle,
  HiFlag, HiCalendarDays, HiArrowTrendingDown, HiChartBar, HiBoltSlash, HiCheckCircle,
  HiExclamationTriangle, HiInformationCircle, HiSparkles,
} from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../utils/formatters'

const LIABILITY_TYPES = [
  { value: 'loan',         label: 'Personal Loan',  icon: HiBuildingLibrary },
  { value: 'credit_card',  label: 'Credit Card',    icon: HiCreditCard },
  { value: 'mortgage',     label: 'Mortgage',       icon: HiHome },
  { value: 'student_loan', label: 'Student Loan',   icon: HiAcademicCap },
  { value: 'other',        label: 'Other',          icon: HiEllipsisHorizontalCircle },
]

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-300'   },
  { value: 'medium', label: 'Medium', color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  { value: 'low',    label: 'Low',    color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-300'  },
]

const COLORS = ['#ef4444','#f97316','#eab308','#8b5cf6','#ec4899','#6366f1','#06b6d4','#10b981']

const EMPTY = {
  name: '', type: 'loan', balance: '',
  interestRate: '', minimumPayment: '', dueDay: '', color: '#ef4444',
  priority: 'medium', deadline: '',
  autoEmi: false, customEmiAmount: '',
}

// ─── Scoring & Simulation ─────────────────────────────────────────────────────

function scoreDebt(l) {
  const priorityPts = { high: 300, medium: 150, low: 0 }[l.priority] ?? 150
  let deadlinePts = 0
  if (l.deadline) {
    const today = new Date()
    const dl    = new Date(l.deadline)
    const monthsLeft = (dl - today) / (1000 * 60 * 60 * 24 * 30.44)
    if (monthsLeft <= 0)  deadlinePts = 500
    else if (monthsLeft <= 3)  deadlinePts = 400
    else if (monthsLeft <= 6)  deadlinePts = 200
    else if (monthsLeft <= 12) deadlinePts = 100
    else deadlinePts = 50
  }
  return priorityPts + deadlinePts
}

function sortedByStrategy(liabilities) {
  return [...liabilities].sort((a, b) => {
    const sa = scoreDebt(a)
    const sb = scoreDebt(b)
    if (sa !== sb) return sb - sa       // higher score first
    return a.balance - b.balance        // smaller balance first (snowball)
  })
}

function simulatePayoff(sorted, monthlyBudget) {
  const debts = sorted.map(l => ({
    id:              l.id,
    name:            l.name,
    type:            l.type,
    color:           l.color,
    priority:        l.priority,
    deadline:        l.deadline,
    originalBalance: l.balance,
    runningBalance:  l.balance,
    interestRate:    l.interestRate  || 0,
    minimumPayment:  l.minimumPayment || 0,
    paidOffMonth:    null,
    totalInterest:   0,
  }))

  const MAX_MONTHS = 360
  let month = 0

  while (debts.some(d => d.runningBalance > 0.5) && month < MAX_MONTHS) {
    month++
    const active    = debts.filter(d => d.runningBalance > 0.5)
    const totalMins = active.reduce((s, d) => s + d.minimumPayment, 0)
    const extra     = Math.max(0, monthlyBudget - totalMins)
    const target    = active[0]

    for (const debt of active) {
      const interest      = debt.runningBalance * debt.interestRate / 100 / 12
      debt.totalInterest += interest
      debt.runningBalance += interest

      let payment = debt.minimumPayment
      if (debt.id === target.id) payment += extra
      payment = Math.min(payment, debt.runningBalance)
      debt.runningBalance = Math.max(0, debt.runningBalance - payment)

      if (debt.runningBalance < 0.5 && !debt.paidOffMonth) {
        debt.runningBalance = 0
        debt.paidOffMonth   = month
      }
    }
  }

  if (month >= MAX_MONTHS) {
    debts.forEach(d => { if (d.runningBalance > 0.5) d.paidOffMonth = null })
  }

  return debts
}

function simulateMinOnly(sorted) {
  const debts = sorted.map(l => ({
    id:              l.id,
    runningBalance:  l.balance,
    interestRate:    l.interestRate  || 0,
    minimumPayment:  l.minimumPayment || 0,
    paidOffMonth:    null,
    totalInterest:   0,
  }))

  const MAX_MONTHS = 360
  let month = 0

  while (debts.some(d => d.runningBalance > 0.5) && month < MAX_MONTHS) {
    month++
    for (const debt of debts) {
      if (debt.runningBalance < 0.5) continue
      const interest      = debt.runningBalance * debt.interestRate / 100 / 12
      debt.totalInterest += interest
      debt.runningBalance += interest
      const payment = Math.min(debt.minimumPayment || debt.runningBalance, debt.runningBalance)
      debt.runningBalance = Math.max(0, debt.runningBalance - payment)
      if (debt.runningBalance < 0.5 && !debt.paidOffMonth) {
        debt.runningBalance = 0
        debt.paidOffMonth   = month
      }
    }
  }

  return debts
}

function monthsToDate(months) {
  if (!months) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtMonths(m) {
  if (!m) return '—'
  if (m < 12) return `${m} mo`
  const y = Math.floor(m / 12)
  const mo = m % 12
  return mo ? `${y}y ${mo}mo` : `${y}y`
}

// ─── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = PRIORITIES.find(x => x.value === priority) || PRIORITIES[1]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.bg} ${p.color}`}>
      <HiFlag className="w-3 h-3" />
      {p.label}
    </span>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Liabilities() {
  const { liabilities, addLiability, updateLiability, deleteLiability, computed, addEmiPlan, emiPlans } = useApp()
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState('overview')

  // Planner state
  const [budget,    setBudget]    = useState('')
  const [frequency, setFrequency] = useState('monthly')

  function openAdd()  { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  function openEdit(l) {
    setEditing(l)
    const hasEmiPlan = emiPlans.some(p => p.referenceId === l.id && p.type === 'liability')
    setForm({
      ...l,
      balance:         String(l.balance),
      interestRate:    l.interestRate   != null ? String(l.interestRate)   : '',
      minimumPayment:  l.minimumPayment != null ? String(l.minimumPayment) : '',
      dueDay:          l.dueDay         != null ? String(l.dueDay)         : '',
      priority:        l.priority || 'medium',
      deadline:        l.deadline || '',
      autoEmi:         false,
      customEmiAmount: hasEmiPlan ? '' : '',
    })
    setError('')
    setModal(true)
  }
  function close()    { setModal(false); setEditing(null); setError('') }
  function set(f, v)  { setForm(p => ({ ...p, [f]: v })) }

  // Compute suggested EMI: balance ÷ months-to-deadline, or fall back to minimumPayment
  const computedEmi = useMemo(() => {
    const balance = parseFloat(form.balance) || 0
    const minPay  = parseFloat(form.minimumPayment) || 0
    if (form.deadline && balance > 0) {
      const monthsLeft = Math.max(1, Math.round(
        (new Date(form.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30.44)
      ))
      return Math.ceil(balance / monthsLeft)
    }
    return minPay
  }, [form.balance, form.minimumPayment, form.deadline])

  const emiAmount = parseFloat(form.customEmiAmount) || computedEmi

  // Whether the editing liability already has an EMI plan
  const existingEmiPlan = editing
    ? emiPlans.find(p => p.referenceId === editing.id && p.type === 'liability')
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        balance:        parseFloat(form.balance)        || 0,
        interestRate:   form.interestRate   !== '' ? parseFloat(form.interestRate)   : null,
        minimumPayment: form.minimumPayment !== '' ? parseFloat(form.minimumPayment) : null,
        dueDay:         form.dueDay         !== '' ? parseInt(form.dueDay, 10)       : null,
        priority:       form.priority || 'medium',
        deadline:       form.deadline || null,
      }

      let savedId
      if (editing) {
        await updateLiability(payload)
        savedId = editing.id
      } else {
        const created = await addLiability(payload)
        savedId = created?.id
      }

      // Auto-create EMI plan when toggled and no plan exists yet
      if (form.autoEmi && payload.dueDay && savedId && !existingEmiPlan) {
        await addEmiPlan({
          type:       'liability',
          referenceId: savedId,
          name:        payload.name,
          amount:      emiAmount,
          dayOfMonth:  payload.dueDay,
          startDate:   new Date().toISOString().split('T')[0],
          frequency:   'monthly',
          isActive:    true,
          notes:       '',
          accountId:   null,
        })
      }

      close()
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const TypeIcon = (type) => LIABILITY_TYPES.find(t => t.value === type)?.icon || HiEllipsisHorizontalCircle
  const totalLiabilities = computed.totalLiabilities

  // ── Planner calculations ────────────────────────────────────────────────────
  const monthlyBudget = useMemo(() => {
    const raw = parseFloat(budget) || 0
    return frequency === 'weekly' ? raw * (52 / 12) : raw
  }, [budget, frequency])

  const totalMinimums = useMemo(
    () => liabilities.reduce((s, l) => s + (l.minimumPayment || 0), 0),
    [liabilities]
  )

  const sorted = useMemo(() => sortedByStrategy(liabilities), [liabilities])

  const simulation   = useMemo(
    () => (monthlyBudget > 0 && liabilities.length > 0) ? simulatePayoff(sorted, monthlyBudget)   : null,
    [sorted, monthlyBudget, liabilities.length]
  )
  const minOnlySim   = useMemo(
    () => (liabilities.length > 0) ? simulateMinOnly(sorted) : null,
    [sorted, liabilities.length]
  )

  const debtFreeMonth     = simulation ? Math.max(...simulation.map(d => d.paidOffMonth || 0))   : null
  const totalInterestWith = simulation ? simulation.reduce((s, d) => s + d.totalInterest, 0)       : 0
  const totalInterestMin  = minOnlySim ? minOnlySim.reduce((s, d) => s + d.totalInterest, 0)       : 0
  const interestSaved     = totalInterestMin - totalInterestWith
  const debtFreeMonthMin  = minOnlySim ? Math.max(...minOnlySim.map(d => d.paidOffMonth || 0)) : null

  const budgetShort = monthlyBudget > 0 && monthlyBudget < totalMinimums

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="card p-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
        <p className="text-red-100 text-sm font-medium mb-1">Total Liabilities</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalLiabilities)}</p>
        <p className="text-red-100 text-xs mt-2">{liabilities.length} liabilit{liabilities.length !== 1 ? 'ies' : 'y'}</p>
      </div>

      {/* Tabs + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'overview', label: '📋 Overview' },
            { id: 'planner',  label: '🎯 Debt Planner' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Liability
        </button>
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liabilities.map(l => {
            const Icon      = TypeIcon(l.type)
            const typeLabel = LIABILITY_TYPES.find(t => t.value === l.type)?.label || l.type
            const sharePct  = totalLiabilities > 0 ? (l.balance / totalLiabilities) * 100 : 0
            const pri       = PRIORITIES.find(p => p.value === l.priority) || PRIORITIES[1]

            return (
              <div key={l.id} className="card p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: l.color }} />

                <div className="flex items-start justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${l.color}18` }}>
                      <Icon className="w-5 h-5" style={{ color: l.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{l.name}</p>
                      <p className="text-xs text-gray-400">{typeLabel}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(l)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteLiability(l.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(l.balance)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Outstanding balance</p>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <PriorityBadge priority={l.priority} />
                  {l.deadline && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                      <HiCalendarDays className="w-3 h-3" />
                      {new Date(l.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {l.interestRate   != null && <span>{l.interestRate}% p.a.</span>}
                  {l.minimumPayment != null && <span>Min. {formatCurrency(l.minimumPayment)}/mo</span>}
                  {l.dueDay         != null && <span>Due on day {l.dueDay}</span>}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Share of total</span>
                    <span>{Math.round(sharePct)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${sharePct}%`, background: l.color }} />
                  </div>
                </div>
              </div>
            )
          })}

          {liabilities.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">💳</p>
              <p className="text-sm font-medium">No liabilities recorded</p>
              <p className="text-xs mt-1">Add loans, credit cards, or other debts to track them here</p>
            </div>
          )}
        </div>
      )}

      {/* ── Planner Tab ───────────────────────────────────────────────────────── */}
      {tab === 'planner' && (
        <div className="space-y-5">
          {liabilities.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm font-medium">No debts to plan</p>
              <p className="text-xs mt-1">Add liabilities first to use the planner</p>
            </div>
          ) : (
            <>
              {/* Budget input */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <HiChartBar className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Repayment Budget</h3>
                </div>

                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="label">Total amount you can pay</label>
                    <input
                      type="number" placeholder="e.g. 50000" min="0" step="500"
                      className="input-field" value={budget}
                      onChange={e => setBudget(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-0.5">
                    {[['monthly','Monthly'],['weekly','Weekly']].map(([v,l]) => (
                      <button key={v} onClick={() => setFrequency(v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${frequency === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { label: 'Total Minimums',  value: formatCurrency(totalMinimums),                           sub: 'per month' },
                    { label: 'Extra to Target', value: formatCurrency(Math.max(0, monthlyBudget - totalMinimums)), sub: 'per month' },
                    { label: 'Debt-free',        value: debtFreeMonth ? monthsToDate(debtFreeMonth) : '—',         sub: debtFreeMonth ? fmtMonths(debtFreeMonth) : 'set a budget' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="font-bold text-gray-900 text-sm">{value}</p>
                      <p className="text-xs text-gray-400">{sub}</p>
                    </div>
                  ))}
                </div>

                {budgetShort && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                    <HiExclamationTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Budget is less than combined minimums ({formatCurrency(totalMinimums)}/mo). Increase your budget to make progress.</span>
                  </div>
                )}

                {/* Interest savings callout */}
                {simulation && interestSaved > 0 && (
                  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                    <HiArrowTrendingDown className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      You'll save <strong>{formatCurrency(Math.round(interestSaved))}</strong> in interest and finish{' '}
                      <strong>{fmtMonths(Math.max(0, (debtFreeMonthMin || 0) - (debtFreeMonth || 0)))}</strong> sooner
                      compared to paying minimums only.
                    </span>
                  </div>
                )}
              </div>

              {/* Strategy info */}
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-indigo-700">
                <HiInformationCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Strategy:</strong> Debts are targeted by deadline urgency → priority → smallest balance first (debt snowball).
                  Extra budget rolls into the next debt once one is paid off.
                </span>
              </div>

              {/* Payoff Queue */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Payoff Order</h3>
                {sorted.map((l, idx) => {
                  const sim       = simulation?.find(d => d.id === l.id)
                  const minSim    = minOnlySim?.find(d => d.id === l.id)
                  const isTarget  = idx === 0
                  const paidOff   = sim?.paidOffMonth != null
                  const Icon      = TypeIcon(l.type)
                  const progress  = sim && sim.originalBalance > 0
                    ? Math.round(((sim.originalBalance - (sim.runningBalance || 0)) / sim.originalBalance) * 100)
                    : 0

                  const extra = (monthlyBudget > 0 && isTarget && !budgetShort)
                    ? Math.max(0, monthlyBudget - totalMinimums)
                    : 0

                  return (
                    <div key={l.id} className={`card p-4 relative overflow-hidden border-2 transition-colors
                      ${isTarget && monthlyBudget > 0 && !budgetShort
                        ? 'border-indigo-400 bg-indigo-50/30'
                        : 'border-transparent'}`}>

                      {/* Color stripe */}
                      <div className="absolute top-0 left-0 w-1 bottom-0 rounded-l-xl" style={{ background: l.color }} />

                      <div className="flex items-start gap-3 pl-2">
                        {/* Rank */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                          ${isTarget && monthlyBudget > 0 && !budgetShort ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {idx + 1}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{l.name}</span>
                                {isTarget && monthlyBudget > 0 && !budgetShort && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
                                    🎯 TARGET
                                  </span>
                                )}
                                <PriorityBadge priority={l.priority} />
                                {l.deadline && (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <HiCalendarDays className="w-3 h-3" />
                                    Due {new Date(l.deadline).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {LIABILITY_TYPES.find(t => t.value === l.type)?.label}
                                {l.interestRate != null && ` · ${l.interestRate}% p.a.`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900 text-sm">{formatCurrency(l.balance)}</p>
                              {l.minimumPayment != null && (
                                <p className="text-xs text-gray-400">Min. {formatCurrency(l.minimumPayment)}/mo</p>
                              )}
                            </div>
                          </div>

                          {/* Payment info */}
                          {monthlyBudget > 0 && !budgetShort && (
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                              <span>
                                Paying: <strong className="text-gray-700">
                                  {formatCurrency((l.minimumPayment || 0) + extra)}/mo
                                </strong>
                                {extra > 0 && ` (min + ${formatCurrency(extra)} extra)`}
                              </span>
                              {sim?.paidOffMonth && (
                                <span>
                                  Paid off: <strong className="text-emerald-600">{monthsToDate(sim.paidOffMonth)}</strong>
                                  {' '}({fmtMonths(sim.paidOffMonth)})
                                </span>
                              )}
                              {sim?.totalInterest > 0 && (
                                <span>Interest: {formatCurrency(Math.round(sim.totalInterest))}</span>
                              )}
                            </div>
                          )}

                          {/* Progress bar */}
                          {simulation && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>{paidOff ? '✓ Paid off' : `${progress}% paid`}</span>
                                {minSim?.paidOffMonth && sim?.paidOffMonth && minSim.paidOffMonth > sim.paidOffMonth && (
                                  <span className="text-emerald-600">
                                    {fmtMonths(minSim.paidOffMonth - sim.paidOffMonth)} sooner
                                  </span>
                                )}
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${paidOff ? 100 : progress}%`, background: paidOff ? '#10b981' : l.color }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals footer */}
              {simulation && (
                <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Total Debt',        value: formatCurrency(liabilities.reduce((s,l) => s+l.balance, 0)) },
                    { label: 'Total Interest',    value: formatCurrency(Math.round(totalInterestWith)) },
                    { label: 'Total Paid',        value: formatCurrency(Math.round(liabilities.reduce((s,l)=>s+l.balance,0) + totalInterestWith)) },
                    { label: 'Interest Saved vs Min', value: interestSaved > 0 ? formatCurrency(Math.round(interestSaved)) : '—', green: interestSaved > 0 },
                  ].map(({ label, value, green }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className={`font-bold text-sm ${green ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      <Modal isOpen={modal} onClose={close} title={editing ? 'Edit Liability' : 'Add Liability'} disableBackdropClose={saving || !!error}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="label">Name</label>
            <input type="text" placeholder="e.g. NMB Personal Loan" required
              className="input-field" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label className="label">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {LIABILITY_TYPES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => set('type', value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors
                    ${form.type === value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Outstanding Balance (NPR)</label>
            <input type="number" placeholder="0" min="0" step="1" required
              className="input-field" value={form.balance} onChange={e => set('balance', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Interest Rate (% p.a.)</label>
              <input type="number" placeholder="e.g. 14.5" min="0" step="0.01"
                className="input-field" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} />
            </div>
            <div>
              <label className="label">Min. Monthly Payment</label>
              <input type="number" placeholder="0" min="0" step="1"
                className="input-field" value={form.minimumPayment} onChange={e => set('minimumPayment', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors
                    ${form.priority === p.value
                      ? `${p.border} ${p.bg} ${p.color}`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <HiFlag className="w-3.5 h-3.5" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Deadline (optional)</label>
              <input type="date" className="input-field" value={form.deadline}
                onChange={e => set('deadline', e.target.value)} />
            </div>
            <div>
              <label className="label">Due Day of Month (optional)</label>
              <input type="number" placeholder="e.g. 15" min="1" max="31" step="1"
                className="input-field" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* ── Auto-EMI section ── */}
          {(form.minimumPayment || form.deadline) && form.dueDay && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <HiSparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-sm font-semibold text-indigo-800">Auto-create EMI Plan</span>
              </div>

              {existingEmiPlan ? (
                <p className="text-xs text-indigo-600">
                  An EMI plan already exists for this liability. Edit it from the EMI page.
                </p>
              ) : (
                <>
                  <p className="text-xs text-indigo-600">
                    {form.deadline && parseFloat(form.balance) > 0
                      ? `Suggested EMI: ${formatCurrency(computedEmi)}/mo (balance ÷ ${Math.max(1, Math.round((new Date(form.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30.44)))} months)`
                      : `Suggested EMI: ${formatCurrency(computedEmi)}/mo (from min. payment)`}
                  </p>

                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => set('autoEmi', !form.autoEmi)}
                      className={`relative w-10 h-6 rounded-full cursor-pointer transition-colors shrink-0
                        ${form.autoEmi ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                        ${form.autoEmi ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm text-indigo-800">
                      {form.autoEmi ? 'Will create EMI plan on save' : 'Enable to auto-create EMI plan'}
                    </span>
                  </div>

                  {form.autoEmi && (
                    <div>
                      <label className="label">EMI Amount (NPR) — editable</label>
                      <input
                        type="number" min="1" step="1" placeholder={String(computedEmi)}
                        className="input-field"
                        value={form.customEmiAmount}
                        onChange={e => set('customEmiAmount', e.target.value)}
                      />
                      <p className="text-[10px] text-indigo-500 mt-1">
                        Due on day {form.dueDay} each month · {formatCurrency(emiAmount)}/mo
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={close} disabled={saving} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Liability'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
