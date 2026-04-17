import { useState } from 'react'
import { HiPlus, HiPencil, HiTrash, HiFlag, HiCalendar, HiArrowTrendingUp } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency, formatDate } from '../utils/formatters'
import { differenceInMonths, parseISO } from 'date-fns'

const COLORS = ['#10b981','#6366f1','#f59e0b','#ec4899','#ef4444','#06b6d4','#8b5cf6','#84cc16']
const EMPTY  = { name: '', targetAmount: '', currentAmount: '', deadline: '', monthlyContribution: '', color: '#10b981' }

function monthsToGoal(target, current, monthly) {
  if (!monthly || monthly <= 0) return null
  const remaining = target - current
  if (remaining <= 0) return 0
  return Math.ceil(remaining / monthly)
}

function predictedDate(target, current, monthly) {
  const months = monthsToGoal(target, current, monthly)
  if (months === null) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useApp()
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function openAdd()  { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  function openEdit(g){ setEditing(g); setForm({ ...g, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), monthlyContribution: String(g.monthlyContribution) }); setError(''); setModal(true) }
  function close()    { setModal(false); setEditing(null); setError('') }
  function set(f, v)  { setForm(p => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = {
        ...form,
        targetAmount: parseFloat(form.targetAmount) || 0,
        currentAmount: parseFloat(form.currentAmount) || 0,
        monthlyContribution: parseFloat(form.monthlyContribution) || 0,
      }
      if (editing) await updateGoal(data)
      else await addGoal(data)
      close()
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const totalTargeted = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved    = goals.reduce((s, g) => s + g.currentAmount, 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Goals</p>
          <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Targeted</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalTargeted)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Saved</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalSaved)}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(g => {
          const pct      = Math.min((g.currentAmount / g.targetAmount) * 100, 100)
          const months   = monthsToGoal(g.targetAmount, g.currentAmount, g.monthlyContribution)
          const predDate = predictedDate(g.targetAmount, g.currentAmount, g.monthlyContribution)
          const isOnTime = g.deadline && predDate && predDate <= parseISO(g.deadline)
          const remaining = g.targetAmount - g.currentAmount

          return (
            <div key={g.id} className="card p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: g.color }} />

              <div className="flex items-start justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${g.color}18` }}>
                    <HiFlag className="w-5 h-5" style={{ color: g.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{g.name}</p>
                    {g.deadline && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <HiCalendar className="w-3 h-3" /> Target: {formatDate(g.deadline)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteGoal(g.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-gray-900">{formatCurrency(g.currentAmount)}</span>
                  <span className="text-gray-400">of {formatCurrency(g.targetAmount)}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: g.color }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs font-semibold" style={{ color: g.color }}>{Math.round(pct)}% complete</span>
                  <span className="text-xs text-gray-400">{formatCurrency(remaining)} left</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-50 pt-3">
                <div>
                  <p className="text-xs text-gray-400">Monthly contribution</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(g.monthlyContribution)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Months remaining</p>
                  <p className="text-sm font-semibold text-gray-900">{months !== null ? `${months} months` : '—'}</p>
                </div>
                {predDate && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Predicted completion</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <HiArrowTrendingUp className={`w-3.5 h-3.5 ${isOnTime ? 'text-emerald-500' : 'text-amber-500'}`} />
                      <p className={`text-sm font-semibold ${isOnTime ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {predDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        {isOnTime ? ' ✓ On track' : ' — Behind schedule'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {pct >= 100 && (
                <div className="text-center bg-emerald-50 text-emerald-700 rounded-xl py-2 text-sm font-semibold">
                  🎉 Goal Achieved!
                </div>
              )}
            </div>
          )
        })}

        {goals.length === 0 && (
          <div className="md:col-span-2 text-center py-16 text-gray-400 card">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-sm font-medium">No goals yet</p>
            <p className="text-xs mt-1">Set your first financial goal to start tracking progress</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modal} onClose={close} title={editing ? 'Edit Goal' : 'Add Financial Goal'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Goal Name</label>
            <input type="text" placeholder="e.g. Emergency Fund" required
              className="input-field" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Target Amount (NPR)</label>
              <input type="number" placeholder="0" min="1" step="1" required
                className="input-field" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} />
            </div>
            <div>
              <label className="label">Already Saved (NPR)</label>
              <input type="number" placeholder="0" min="0" step="1"
                className="input-field" value={form.currentAmount} onChange={e => set('currentAmount', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly Contribution (NPR)</label>
              <input type="number" placeholder="0" min="0" step="1"
                className="input-field" value={form.monthlyContribution} onChange={e => set('monthlyContribution', e.target.value)} />
            </div>
            <div>
              <label className="label">Target Date</label>
              <input type="date" className="input-field" value={form.deadline?.split('T')[0] || ''} onChange={e => set('deadline', e.target.value)} />
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

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={close} disabled={saving} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
