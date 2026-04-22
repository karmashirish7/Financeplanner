import { useState, useMemo, useEffect } from 'react'
import { HiPlus, HiTrash, HiExclamationTriangle, HiCheckCircle } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency, formatCurrencyShort, isInMonth } from '../utils/formatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { subMonths } from 'date-fns'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'planner',  label: '🧮 Planner'  },
  { id: 'monthly',  label: '📅 Monthly'  },
]

export default function Budget() {
  const { categories, budgets, setBudget, deleteBudget, transactions, emiPlans, goals } = useApp()

  const now = new Date()
  const [tab,   setTab]   = useState('overview')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId: '', amount: '' })

  const expenseCats = categories.filter(c => c.type === 'expense')

  // ── Last 6 months data ────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d   = subMonths(now, 5 - i)
      const mm  = d.getMonth() + 1
      const yy  = d.getFullYear()
      const txs = transactions.filter(t => isInMonth(t.date, mm, yy))
      const inc = txs.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0)
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const catSpend = {}
      txs.filter(t => t.type === 'expense').forEach(t => {
        catSpend[t.categoryId] = (catSpend[t.categoryId] || 0) + t.amount
      })
      return { label: d.toLocaleString('default', { month: 'short' }), income: inc, expenses: exp, catSpend }
    })
  }, [transactions])

  const activeMonths = Math.max(monthlyData.filter(m => m.income > 0 || m.expenses > 0).length, 1)
  const avgIncome    = Math.round(monthlyData.reduce((s, m) => s + m.income,   0) / activeMonths)
  const avgExpenses  = Math.round(monthlyData.reduce((s, m) => s + m.expenses, 0) / activeMonths)
  const avgSavings   = avgIncome - avgExpenses
  const avgSavingsRate = avgIncome > 0 ? Math.round((avgSavings / avgIncome) * 100) : 0

  const catAvgSpend = useMemo(() => {
    const totals = {}
    monthlyData.forEach(m => {
      Object.entries(m.catSpend).forEach(([id, amt]) => {
        totals[id] = (totals[id] || 0) + amt
      })
    })
    return Object.fromEntries(Object.entries(totals).map(([id, t]) => [id, Math.round(t / activeMonths)]))
  }, [monthlyData, activeMonths])

  // ── Planner state ─────────────────────────────────────────────────────────
  const [plannerIncome, setPlannerIncome] = useState('')
  const [catInputs,     setCatInputs]     = useState({})
  const [plannerReady,  setPlannerReady]  = useState(false)

  useEffect(() => {
    if (!plannerReady && (avgIncome > 0 || Object.keys(catAvgSpend).length > 0)) {
      setPlannerIncome(String(avgIncome || ''))
      const init = {}
      Object.entries(catAvgSpend).forEach(([id, avg]) => { init[id] = String(avg) })
      setCatInputs(init)
      setPlannerReady(true)
    }
  }, [avgIncome, catAvgSpend, plannerReady])

  const plannerIncomeNum  = parseFloat(plannerIncome) || 0
  const totalEmi          = emiPlans.filter(p => p.isActive && p.frequency === 'monthly').reduce((s, p) => s + p.amount, 0)
  const totalSip          = goals.reduce((s, g) => s + (g.monthlyContribution || 0), 0)
  const totalCatExpenses  = Object.values(catInputs).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const plannerSavings    = plannerIncomeNum - totalEmi - totalSip - totalCatExpenses
  const plannerSavingsRate = plannerIncomeNum > 0 ? (plannerSavings / plannerIncomeNum) * 100 : 0

  const plannerPieData = useMemo(() => {
    const slices = []
    if (totalEmi > 0)        slices.push({ name: 'EMI / Loans', value: totalEmi,  color: '#ef4444' })
    if (totalSip > 0)        slices.push({ name: 'SIP / Goals', value: totalSip,  color: '#8b5cf6' })
    expenseCats.forEach(cat => {
      const v = parseFloat(catInputs[cat.id]) || 0
      if (v > 0) slices.push({ name: cat.name, value: v, color: cat.color || '#6b7280' })
    })
    if (plannerSavings > 0)  slices.push({ name: 'Savings',    value: plannerSavings, color: '#10b981' })
    return slices
  }, [catInputs, totalEmi, totalSip, plannerSavings, expenseCats])

  // ── Monthly tab data ──────────────────────────────────────────────────────
  const actualSpend = {}
  transactions
    .filter(t => t.type === 'expense' && isInMonth(t.date, month, year))
    .forEach(t => { actualSpend[t.categoryId] = (actualSpend[t.categoryId] || 0) + t.amount })

  const monthBudgets = budgets.filter(b => b.month === month && b.year === year)
  const allCatIds    = [...new Set([...monthBudgets.map(b => b.categoryId), ...Object.keys(actualSpend)])]
  const rows = allCatIds.map(catId => {
    const cat    = categories.find(c => c.id === catId)
    const budget = monthBudgets.find(b => b.categoryId === catId)
    const spent  = actualSpend[catId] || 0
    const limit  = budget?.amount || 0
    const pct    = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
    const over   = limit > 0 && spent > limit
    return { cat, budget, spent, limit, pct, over, catId }
  }).filter(r => r.cat)

  const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent  = Object.values(actualSpend).reduce((s, v) => s + v, 0)
  const overallPct  = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.categoryId || !form.amount) return
    setBudget({ categoryId: form.categoryId, amount: parseFloat(form.amount), month, year })
    setModal(false)
    setForm({ categoryId: '', amount: '' })
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-5">

          {/* Avg summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Avg Income</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrencyShort(avgIncome)}</p>
              <p className="text-[10px] text-gray-400 mt-1">per month · 6mo avg</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Avg Expenses</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrencyShort(avgExpenses)}</p>
              <p className="text-[10px] text-gray-400 mt-1">per month · 6mo avg</p>
            </div>
            <div className={`card p-4 ${avgSavings >= 0 ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
              <p className="text-xs text-gray-500 font-medium mb-1">Avg Savings</p>
              <p className={`text-xl font-bold ${avgSavings >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {avgSavings < 0 ? '-' : ''}{formatCurrencyShort(Math.abs(avgSavings))}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">{avgSavings >= 0 ? 'surplus' : 'deficit'} avg</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">Savings Rate</p>
              <p className={`text-xl font-bold ${avgSavingsRate >= 20 ? 'text-emerald-600' : avgSavingsRate >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                {avgSavingsRate}%
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {avgSavingsRate >= 20 ? 'excellent' : avgSavingsRate >= 10 ? 'good' : 'needs work'}
              </p>
            </div>
          </div>

          {/* EMI + SIP quick summary */}
          {(totalEmi > 0 || totalSip > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {totalEmi > 0 && (
                <div className="card p-4 border-l-4 border-red-400">
                  <p className="text-xs text-gray-500 font-medium mb-1">Monthly EMI</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrencyShort(totalEmi)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {emiPlans.filter(p => p.isActive && p.frequency === 'monthly').length} active loan{emiPlans.filter(p => p.isActive && p.frequency === 'monthly').length !== 1 ? 's' : ''}
                    {avgIncome > 0 && ` · ${Math.round((totalEmi / avgIncome) * 100)}% of avg income`}
                  </p>
                </div>
              )}
              {totalSip > 0 && (
                <div className="card p-4 border-l-4 border-purple-400">
                  <p className="text-xs text-gray-500 font-medium mb-1">Monthly SIP / Goals</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrencyShort(totalSip)}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {goals.filter(g => g.monthlyContribution > 0).length} goal{goals.filter(g => g.monthlyContribution > 0).length !== 1 ? 's' : ''}
                    {avgIncome > 0 && ` · ${Math.round((totalSip / avgIncome) * 100)}% of avg income`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Income vs Expenses chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Income vs Expenses — Last 6 Months</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                <Tooltip formatter={v => [formatCurrency(v)]} />
                <Bar dataKey="income"   name="Income"   fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              {[['#6366f1','Income'],['#f87171','Expenses']].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Category avg spend */}
          {expenseCats.some(c => catAvgSpend[c.id] > 0) && (
            <div className="card overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-sm font-semibold text-gray-900">Avg Monthly Spend by Category</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 6 months average</p>
              </div>
              <div className="divide-y divide-gray-50">
                {expenseCats
                  .filter(c => catAvgSpend[c.id] > 0)
                  .sort((a, b) => (catAvgSpend[b.id] || 0) - (catAvgSpend[a.id] || 0))
                  .map(cat => {
                    const avg         = catAvgSpend[cat.id] || 0
                    const pctOfIncome = avgIncome > 0 ? (avg / avgIncome) * 100 : 0
                    return (
                      <div key={cat.id} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cat.icon}</span>
                            <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(avg)}</span>
                            <span className="text-xs text-gray-400 ml-2">{Math.round(pctOfIncome)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(pctOfIncome, 100)}%`, background: cat.color || '#6366f1' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PLANNER ═══════════════════════════════════════════════════════════ */}
      {tab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

          {/* Left column: inputs */}
          <div className="lg:col-span-3 space-y-4">

            {/* Income */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">💰 Monthly Income</h3>
              <input
                type="number" min="0" step="500"
                className="input-field text-base font-semibold"
                placeholder="Enter your monthly income"
                value={plannerIncome}
                onChange={e => setPlannerIncome(e.target.value)}
              />
              {avgIncome > 0 && (
                <button onClick={() => setPlannerIncome(String(avgIncome))}
                  className="text-xs text-indigo-500 mt-1.5 hover:underline">
                  Use 6-month average ({formatCurrency(avgIncome)})
                </button>
              )}
            </div>

            {/* Fixed Commitments */}
            {(emiPlans.filter(p => p.isActive && p.frequency === 'monthly').length > 0 ||
              goals.some(g => g.monthlyContribution > 0)) && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">🔒 Fixed Commitments</h3>
                <div className="space-y-2">
                  {emiPlans.filter(p => p.isActive && p.frequency === 'monthly').map(plan => (
                    <div key={plan.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        <span className="text-sm text-gray-700">{plan.name}</span>
                        <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">EMI</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(plan.amount)}</span>
                    </div>
                  ))}
                  {goals.filter(g => g.monthlyContribution > 0).map(goal => (
                    <div key={goal.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                        <span className="text-sm text-gray-700">{goal.name}</span>
                        <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">SIP</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">{formatCurrency(goal.monthlyContribution)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Total Fixed</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(totalEmi + totalSip)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Variable Expenses */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">📊 Variable Expenses</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Slide or type to adjust</p>
                </div>
                <button
                  onClick={() => {
                    const init = {}
                    Object.entries(catAvgSpend).forEach(([id, avg]) => { init[id] = String(avg) })
                    setCatInputs(init)
                  }}
                  className="text-xs text-indigo-500 hover:underline">
                  Reset to avg
                </button>
              </div>
              <div className="space-y-5">
                {expenseCats.map(cat => {
                  const val       = parseFloat(catInputs[cat.id]) || 0
                  const avg       = catAvgSpend[cat.id] || 0
                  const maxSlider = Math.max(avg * 2.5, 10000, val * 1.5)
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{cat.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                          {avg > 0 && (
                            <button
                              onClick={() => setCatInputs(p => ({ ...p, [cat.id]: String(avg) }))}
                              className="text-[10px] text-indigo-400 hover:underline ml-1">
                              avg
                            </button>
                          )}
                        </div>
                        <input
                          type="number" min="0" step="100"
                          className="w-28 text-right text-sm font-semibold bg-transparent border-b border-gray-200 focus:border-indigo-400 outline-none py-0.5 px-1"
                          value={catInputs[cat.id] ?? ''}
                          placeholder="0"
                          onChange={e => setCatInputs(p => ({ ...p, [cat.id]: e.target.value }))}
                        />
                      </div>
                      <input
                        type="range" min="0" max={Math.round(maxSlider)} step="100"
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: cat.color || '#6366f1' }}
                        value={val}
                        onChange={e => setCatInputs(p => ({ ...p, [cat.id]: e.target.value }))}
                      />
                      {avg > 0 && (
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>NPR 0</span>
                          <span>avg {formatCurrencyShort(avg)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-gray-100 mt-5 pt-3 flex justify-between">
                <span className="text-sm font-medium text-gray-500">Total Variable</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(totalCatExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Right column: live summary */}
          <div className="lg:col-span-2">
            <div className="card p-5 sticky top-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Budget Summary</h3>

              {/* Breakdown rows */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">💰 Income</span>
                  <span className="text-sm font-semibold text-gray-900">+{formatCurrency(plannerIncomeNum)}</span>
                </div>
                {totalEmi > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">🏦 EMI / Loans</span>
                    <span className="text-sm font-semibold text-red-500">−{formatCurrency(totalEmi)}</span>
                  </div>
                )}
                {totalSip > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">🎯 SIP / Goals</span>
                    <span className="text-sm font-semibold text-purple-500">−{formatCurrency(totalSip)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">📊 Expenses</span>
                  <span className="text-sm font-semibold text-orange-500">−{formatCurrency(totalCatExpenses)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">💵 Savings</span>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${plannerSavings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {plannerSavings >= 0 ? '+' : ''}{formatCurrency(plannerSavings)}
                    </p>
                    {plannerIncomeNum > 0 && (
                      <p className={`text-xs font-medium ${plannerSavings >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {Math.round(plannerSavingsRate)}% of income
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Health hint */}
              {plannerIncomeNum > 0 && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  plannerSavings < 0           ? 'bg-red-50 text-red-600'
                  : plannerSavingsRate >= 20   ? 'bg-emerald-50 text-emerald-700'
                  : plannerSavingsRate >= 10   ? 'bg-amber-50 text-amber-700'
                  :                              'bg-red-50 text-red-600'
                }`}>
                  {plannerSavings < 0
                    ? '🚨 Spending exceeds income — trim expenses or raise income.'
                    : plannerSavingsRate >= 20
                    ? '✅ Excellent! Saving 20%+ of your income.'
                    : plannerSavingsRate >= 10
                    ? '⚠️ Decent — try to push savings above 20%.'
                    : '❌ Low savings rate. Review your variable expenses.'}
                </div>
              )}

              {/* Donut chart */}
              {plannerPieData.length > 0 && plannerIncomeNum > 0 && (
                <div>
                  <p className="text-xs text-gray-400 text-center mb-1">Income Allocation</p>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={plannerPieData}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={78}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {plannerPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => [formatCurrency(v)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {plannerPieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-gray-600">{d.name}</span>
                        </div>
                        <span className="text-gray-500 font-medium">
                          {Math.round((d.value / plannerIncomeNum) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ MONTHLY ═══════════════════════════════════════════════════════════ */}
      {tab === 'monthly' && (
        <div className="space-y-5">

          {/* Month selector */}
          <div className="card p-4 flex flex-wrap items-center gap-3">
            <select className="input-field w-auto" value={year} onChange={e => setYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex gap-1 flex-wrap">
              {MONTHS.map((m, i) => (
                <button key={m} onClick={() => setMonth(i + 1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${month === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {m}
                </button>
              ))}
            </div>
            <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-1.5 ml-auto flex-shrink-0">
              <HiPlus className="w-4 h-4" /> Set Budget
            </button>
          </div>

          {/* Overall bar */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{MONTHS[month - 1]} {year} Overview</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatCurrency(totalSpent)} spent of {formatCurrency(totalBudget)} budgeted
                </p>
              </div>
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${overallPct >= 100 ? 'text-red-500' : overallPct >= 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {overallPct >= 100
                  ? <HiExclamationTriangle className="w-4 h-4" />
                  : <HiCheckCircle className="w-4 h-4" />}
                {Math.round(overallPct)}% used
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overallPct >= 100 ? 'bg-red-500' : overallPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            {totalBudget > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {totalSpent <= totalBudget
                  ? `${formatCurrency(totalBudget - totalSpent)} remaining`
                  : `${formatCurrency(totalSpent - totalBudget)} over budget`}
              </p>
            )}
          </div>

          {/* Category rows */}
          <div className="card overflow-hidden">
            {rows.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm font-medium">No budgets or spending for this month</p>
                <p className="text-xs mt-1">Set a budget to start tracking</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {rows.map(({ cat, budget, spent, limit, pct, over, catId }) => (
                  <div key={catId} className={`px-5 py-4 ${over ? 'bg-red-50/40' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                          {over && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <HiExclamationTriangle className="w-3 h-3" />
                              Over by {formatCurrency(spent - limit)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${over ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(spent)}
                          </p>
                          {limit > 0 && <p className="text-xs text-gray-400">of {formatCurrency(limit)}</p>}
                        </div>
                        {budget && (
                          <button onClick={() => deleteBudget(budget.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                            <HiTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {limit > 0 ? (
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No budget set for this category</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set Budget Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Set Budget — ${MONTHS[month - 1]} ${year}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select required className="input-field" value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Select category</option>
              {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Budget Amount (NPR)</label>
            <input type="number" placeholder="0" min="1" step="1" required
              className="input-field" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Set Budget</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
