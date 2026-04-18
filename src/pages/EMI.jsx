import { useState, useMemo } from 'react'
import {
  HiPlus, HiPencil, HiTrash, HiCheckCircle, HiXCircle,
  HiCreditCard, HiBuildingLibrary, HiAcademicCap, HiHome,
  HiFlag, HiEllipsisHorizontalCircle, HiCalendarDays,
  HiChevronLeft, HiChevronRight, HiBoltSlash,
} from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../utils/formatters'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIABILITY_ICONS = {
  loan:         HiBuildingLibrary,
  credit_card:  HiCreditCard,
  mortgage:     HiHome,
  student_loan: HiAcademicCap,
  other:        HiEllipsisHorizontalCircle,
}

function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function dueDate(year, month, day) {
  const d = Math.min(day || 1, new Date(year, month, 0).getDate())
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Generate this month's scheduled items for all active plans
function buildSchedule(plans, payments, year, month) {
  const pk = periodKey(year, month)
  return plans
    .filter(p => {
      if (!p.isActive) return false
      const [sy, sm] = p.startDate.split('-').map(Number)
      return year > sy || (year === sy && month >= sm)
    })
    .map(plan => {
      const dd     = dueDate(year, month, plan.dayOfMonth)
      const pmt    = payments.find(p => p.planId === plan.id && p.periodKey === pk)
      const today  = new Date().toISOString().split('T')[0]
      const isOverdue = !pmt && dd < today
      return {
        plan,
        periodKey: pk,
        dueDate:   dd,
        amount:    plan.amount,
        status:    pmt?.status || (isOverdue ? 'overdue' : 'pending'),
        payment:   pmt || null,
      }
    })
    .sort((a, b) => (a.plan.dayOfMonth || 1) - (b.plan.dayOfMonth || 1))
}

const EMPTY_PLAN = {
  type:        'liability',
  referenceId: '',
  accountId:   '',
  amount:      '',
  frequency:   'monthly',
  dayOfMonth:  '',
  startDate:   new Date().toISOString().split('T')[0],
  isActive:    true,
  notes:       '',
}

const EMPTY_PAY = { amount: '', accountId: '', categoryId: '', date: new Date().toISOString().split('T')[0] }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EMI() {
  const {
    liabilities, goals, accounts, categories,
    emiPlans, emiPayments,
    addEmiPlan, updateEmiPlan, deleteEmiPlan,
    payEmiPayment, skipEmiPayment,
  } = useApp()

  const [tab, setTab]     = useState('schedule')
  const today             = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)

  // Plan modal
  const [planModal,   setPlanModal]   = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm,    setPlanForm]    = useState(EMPTY_PLAN)
  const [planSaving,  setPlanSaving]  = useState(false)
  const [planError,   setPlanError]   = useState('')

  // Pay modal
  const [payModal,   setPayModal]   = useState(false)
  const [payItem,    setPayItem]    = useState(null)  // schedule item
  const [payForm,    setPayForm]    = useState(EMPTY_PAY)
  const [paySaving,  setPaySaving]  = useState(false)
  const [payError,   setPayError]   = useState('')

  // ── Month nav ───────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const monthLabel = new Date(viewYear, viewMonth - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ── Schedule ────────────────────────────────────────────────────────────
  const schedule = useMemo(
    () => buildSchedule(emiPlans, emiPayments, viewYear, viewMonth),
    [emiPlans, emiPayments, viewYear, viewMonth]
  )
  const liabilityItems = schedule.filter(s => s.plan.type === 'liability')
  const goalItems      = schedule.filter(s => s.plan.type === 'goal')
  const totalDue       = schedule.reduce((s, x) => s + x.amount, 0)
  const totalPaid      = schedule.filter(x => x.status === 'paid').reduce((s, x) => s + x.amount, 0)
  const pendingCount   = schedule.filter(x => x.status !== 'paid' && x.status !== 'skipped').length

  // ── Plan CRUD helpers ───────────────────────────────────────────────────
  function openAddPlan() {
    setEditingPlan(null)
    setPlanForm(EMPTY_PLAN)
    setPlanError('')
    setPlanModal(true)
  }
  function openEditPlan(plan) {
    setEditingPlan(plan)
    setPlanForm({
      type:        plan.type,
      referenceId: plan.referenceId,
      accountId:   plan.accountId || '',
      amount:      String(plan.amount),
      frequency:   plan.frequency,
      dayOfMonth:  plan.dayOfMonth != null ? String(plan.dayOfMonth) : '',
      startDate:   plan.startDate,
      isActive:    plan.isActive,
      notes:       plan.notes,
    })
    setPlanError('')
    setPlanModal(true)
  }
  function closePlan() { setPlanModal(false); setEditingPlan(null); setPlanError('') }
  function setP(f, v)  { setPlanForm(p => ({ ...p, [f]: v })) }

  // Auto-fill name + amount when reference changes
  function handleReferenceChange(refId) {
    setP('referenceId', refId)
    if (planForm.type === 'liability') {
      const l = liabilities.find(x => x.id === refId)
      if (l) setP('amount', String(l.minimumPayment || ''))
    } else {
      const g = goals.find(x => x.id === refId)
      if (g) setP('amount', String(g.monthlyContribution || ''))
    }
  }

  async function handlePlanSubmit(e) {
    e.preventDefault()
    if (!planForm.referenceId) { setPlanError('Please select a liability or goal.'); return }
    const refName = planForm.type === 'liability'
      ? liabilities.find(l => l.id === planForm.referenceId)?.name
      : goals.find(g => g.id === planForm.referenceId)?.name
    setPlanSaving(true)
    setPlanError('')
    try {
      const payload = {
        ...planForm,
        name:       refName || 'EMI Plan',
        amount:     parseFloat(planForm.amount) || 0,
        dayOfMonth: planForm.dayOfMonth !== '' ? parseInt(planForm.dayOfMonth, 10) : null,
        accountId:  planForm.accountId || null,
      }
      if (editingPlan) await updateEmiPlan({ ...payload, id: editingPlan.id })
      else             await addEmiPlan(payload)
      closePlan()
    } catch (err) {
      setPlanError(err?.message || 'Failed to save plan.')
    } finally {
      setPlanSaving(false)
    }
  }

  // ── Pay modal helpers ───────────────────────────────────────────────────
  function openPay(item) {
    setPayItem(item)
    setPayForm({
      amount:     String(item.amount),
      accountId:  item.plan.accountId || (accounts[0]?.id || ''),
      categoryId: '',
      date:       new Date().toISOString().split('T')[0],
    })
    setPayError('')
    setPayModal(true)
  }
  function closePay() { setPayModal(false); setPayItem(null); setPayError('') }
  function setF(f, v) { setPayForm(p => ({ ...p, [f]: v })) }

  async function handlePay(e) {
    e.preventDefault()
    if (!payForm.accountId) { setPayError('Select an account to pay from.'); return }
    setPaySaving(true)
    setPayError('')
    try {
      await payEmiPayment({
        plan:       payItem.plan,
        periodKey:  payItem.periodKey,
        dueDate:    payItem.dueDate,
        amount:     parseFloat(payForm.amount) || payItem.amount,
        accountId:  payForm.accountId,
        categoryId: payForm.categoryId || null,
      })
      closePay()
    } catch (err) {
      setPayError(err?.message || 'Payment failed. Please try again.')
    } finally {
      setPaySaving(false)
    }
  }

  async function handleSkip(item) {
    try {
      await skipEmiPayment({ plan: item.plan, periodKey: item.periodKey, dueDate: item.dueDate })
    } catch {}
  }

  const expenseCategories = categories.filter(c => c.type === 'expense')

  // ── Render helpers ──────────────────────────────────────────────────────
  function StatusBadge({ status }) {
    if (status === 'paid')    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><HiCheckCircle className="w-3.5 h-3.5" /> Paid</span>
    if (status === 'skipped') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"><HiXCircle className="w-3.5 h-3.5" /> Skipped</span>
    if (status === 'overdue') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600"><HiCalendarDays className="w-3.5 h-3.5" /> Overdue</span>
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600"><HiCalendarDays className="w-3.5 h-3.5" /> Pending</span>
  }

  function ScheduleGroup({ items, title, emptyMsg }) {
    if (items.length === 0) return null
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
        {items.map(item => {
          const { plan, status, dueDate: dd, amount, payment } = item
          const acc = accounts.find(a => a.id === plan.accountId)
          const ref = plan.type === 'liability'
            ? liabilities.find(l => l.id === plan.referenceId)
            : goals.find(g => g.id === plan.referenceId)
          const Icon = plan.type === 'liability'
            ? (LIABILITY_ICONS[ref?.type] || HiEllipsisHorizontalCircle)
            : HiFlag
          const canAct = status !== 'paid' && status !== 'skipped'

          return (
            <div key={`${plan.id}-${item.periodKey}`}
              className="card p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ background: plan.type === 'liability' ? (ref?.color || '#ef4444') : (ref?.color || '#6366f1') }} />

              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${plan.type === 'liability' ? (ref?.color || '#ef4444') : (ref?.color || '#6366f1')}18` }}>
                <Icon className="w-5 h-5"
                  style={{ color: plan.type === 'liability' ? (ref?.color || '#ef4444') : (ref?.color || '#6366f1') }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                  <StatusBadge status={status} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
                  {dd && <span>Due {new Date(dd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  {acc && <span>From {acc.name}</span>}
                  {plan.type === 'liability' && ref?.interestRate != null && <span>{ref.interestRate}% p.a.</span>}
                  {payment?.paidAt && (
                    <span className="text-emerald-600">
                      Paid {new Date(payment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{formatCurrency(amount)}</p>
                {canAct && (
                  <div className="flex gap-1.5 mt-1.5 justify-end">
                    <button onClick={() => openPay(item)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                      Pay
                    </button>
                    <button onClick={() => handleSkip(item)}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                      Skip
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <p className="text-indigo-200 text-sm font-medium mb-1">Monthly EMI & Contributions</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalDue)}</p>
        <div className="flex gap-4 mt-2 text-indigo-200 text-xs">
          <span>{emiPlans.filter(p => p.isActive).length} active plans</span>
          {pendingCount > 0 && <span>· {pendingCount} pending</span>}
          {totalPaid > 0 && <span>· {formatCurrency(totalPaid)} paid this month</span>}
        </div>
      </div>

      {/* Tabs + Add */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[['schedule','📅 Schedule'],['plans','⚙️ Plans']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={openAddPlan} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Plan
        </button>
      </div>

      {/* ── Schedule Tab ─────────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <div className="space-y-5">
          {/* Month picker */}
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <HiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-900 text-sm">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <HiChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {schedule.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm font-medium">No payments scheduled for {monthLabel}</p>
              <p className="text-xs mt-1">Add a plan to start tracking EMIs and contributions</p>
            </div>
          ) : (
            <>
              <ScheduleGroup items={liabilityItems} title="Loan Repayments" emptyMsg="" />
              <ScheduleGroup items={goalItems}      title="Goal Contributions" emptyMsg="" />
            </>
          )}
        </div>
      )}

      {/* ── Plans Tab ────────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="space-y-3">
          {emiPlans.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">⚙️</p>
              <p className="text-sm font-medium">No plans yet</p>
              <p className="text-xs mt-1">Set up recurring EMIs and goal contributions</p>
            </div>
          ) : (
            emiPlans.map(plan => {
              const ref = plan.type === 'liability'
                ? liabilities.find(l => l.id === plan.referenceId)
                : goals.find(g => g.id === plan.referenceId)
              const acc  = accounts.find(a => a.id === plan.accountId)
              const Icon = plan.type === 'liability'
                ? (LIABILITY_ICONS[ref?.type] || HiEllipsisHorizontalCircle) : HiFlag
              const accentColor = plan.type === 'liability' ? (ref?.color || '#ef4444') : (ref?.color || '#6366f1')

              return (
                <div key={plan.id} className={`card p-4 flex items-center gap-4 relative overflow-hidden ${!plan.isActive ? 'opacity-50' : ''}`}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accentColor }} />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${accentColor}18` }}>
                    <Icon className="w-5 h-5" style={{ color: accentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.type === 'liability' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {plan.type === 'liability' ? 'Loan' : 'Goal'}
                      </span>
                      {!plan.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(plan.amount)}/{plan.frequency}
                      {plan.dayOfMonth != null && ` · day ${plan.dayOfMonth}`}
                      {acc && ` · ${acc.name}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditPlan(plan)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEmiPlan(plan.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Add / Edit Plan Modal ─────────────────────────────────────────── */}
      <Modal isOpen={planModal} onClose={closePlan} title={editingPlan ? 'Edit Plan' : 'Add EMI Plan'} disableBackdropClose={planSaving || !!planError}>
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          {planError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{planError}</p>}

          {/* Type */}
          <div>
            <label className="label">Plan Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[['liability','💳 Loan / EMI'],['goal','🎯 Goal Contribution']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => { setP('type', v); setP('referenceId', '') }}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-colors
                    ${planForm.type === v ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="label">{planForm.type === 'liability' ? 'Select Liability' : 'Select Goal'}</label>
            <select className="input-field" value={planForm.referenceId}
              onChange={e => handleReferenceChange(e.target.value)} required>
              <option value="">— choose —</option>
              {(planForm.type === 'liability' ? liabilities : goals).map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          {/* Amount + Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (NPR)</label>
              <input type="number" placeholder="0" min="1" step="1" required
                className="input-field" value={planForm.amount}
                onChange={e => setP('amount', e.target.value)} />
            </div>
            <div>
              <label className="label">Day of Month</label>
              <input type="number" placeholder="e.g. 15" min="1" max="31"
                className="input-field" value={planForm.dayOfMonth}
                onChange={e => setP('dayOfMonth', e.target.value)} />
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="label">Pay From Account</label>
            <select className="input-field" value={planForm.accountId}
              onChange={e => setP('accountId', e.target.value)}>
              <option value="">— choose when paying —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
          </div>

          {/* Frequency + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frequency</label>
              <select className="input-field" value={planForm.frequency}
                onChange={e => setP('frequency', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input-field" value={planForm.startDate}
                onChange={e => setP('startDate', e.target.value)} required />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-10 h-6 rounded-full transition-colors ${planForm.isActive ? 'bg-indigo-600' : 'bg-gray-200'}`}
              onClick={() => setP('isActive', !planForm.isActive)}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${planForm.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-gray-700">Active</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closePlan} disabled={planSaving} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={planSaving} className="btn-primary flex-1">
              {planSaving ? 'Saving…' : editingPlan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Mark as Paid Modal ────────────────────────────────────────────── */}
      <Modal isOpen={payModal} onClose={closePay} title={`Pay · ${payItem?.plan?.name}`} disableBackdropClose={paySaving || !!payError}>
        <form onSubmit={handlePay} className="space-y-4">
          {payError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{payError}</p>}

          {/* Summary */}
          {payItem && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium capitalize">{payItem.plan.type === 'liability' ? 'Loan Repayment' : 'Goal Contribution'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="font-medium">{payItem.periodKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled</span>
                <span className="font-medium">{formatCurrency(payItem.amount)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="label">Amount to Pay (NPR)</label>
            <input type="number" placeholder="0" min="1" step="1" required
              className="input-field" value={payForm.amount}
              onChange={e => setF('amount', e.target.value)} />
          </div>

          <div>
            <label className="label">Pay From Account</label>
            <select className="input-field" value={payForm.accountId}
              onChange={e => setF('accountId', e.target.value)} required>
              <option value="">— select account —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Expense Category (optional)</label>
            <select className="input-field" value={payForm.categoryId}
              onChange={e => setF('categoryId', e.target.value)}>
              <option value="">— uncategorized —</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Payment Date</label>
            <input type="date" className="input-field" value={payForm.date}
              onChange={e => setF('date', e.target.value)} required />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closePay} disabled={paySaving} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={paySaving} className="btn-primary flex-1">
              {paySaving ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
