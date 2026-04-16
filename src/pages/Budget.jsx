import { useState } from 'react'
import { HiPlus, HiTrash, HiExclamationTriangle, HiCheckCircle } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../utils/formatters'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Budget() {
  const { categories, budgets, setBudget, deleteBudget, transactions, computed } = useApp()

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year,  setYear]  = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId: '', amount: '' })

  const expenseCats = categories.filter(c => c.type === 'expense')

  // Actual spending per category for selected month
  const actualSpend = {}
  transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() + 1 === month && new Date(t.date).getFullYear() === year)
    .forEach(t => { actualSpend[t.categoryId] = (actualSpend[t.categoryId] || 0) + t.amount })

  // Budgets for selected month
  const monthBudgets = budgets.filter(b => b.month === month && b.year === year)

  // All categories that have either a budget or spending
  const allCatIds = [...new Set([
    ...monthBudgets.map(b => b.categoryId),
    ...Object.keys(actualSpend),
  ])]

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

  return (
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

      {/* Overall summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {MONTHS[month - 1]} {year} Overview
            </h3>
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
                      <button onClick={() => deleteBudget(budget.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
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

      {/* Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={`Set Budget — ${MONTHS[month-1]} ${year}`}>
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
