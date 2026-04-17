import { useState } from 'react'
import {
  HiPlus, HiPencil, HiTrash,
  HiCreditCard, HiBuildingLibrary, HiAcademicCap, HiHome, HiEllipsisHorizontalCircle,
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

const COLORS = ['#ef4444','#f97316','#eab308','#8b5cf6','#ec4899','#6366f1','#06b6d4','#10b981']

const EMPTY = {
  name: '', type: 'loan', balance: '',
  interestRate: '', minimumPayment: '', dueDay: '', color: '#ef4444',
}

export default function Liabilities() {
  const { liabilities, addLiability, updateLiability, deleteLiability, computed } = useApp()
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function openAdd()  { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  function openEdit(l) {
    setEditing(l)
    setForm({
      ...l,
      balance:        String(l.balance),
      interestRate:   l.interestRate   != null ? String(l.interestRate)   : '',
      minimumPayment: l.minimumPayment != null ? String(l.minimumPayment) : '',
      dueDay:         l.dueDay         != null ? String(l.dueDay)         : '',
    })
    setError('')
    setModal(true)
  }
  function close()   { setModal(false); setEditing(null); setError('') }
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

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
      }
      if (editing) await updateLiability(payload)
      else         await addLiability(payload)
      close()
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const TypeIcon = (type) => LIABILITY_TYPES.find(t => t.value === type)?.icon || HiEllipsisHorizontalCircle

  const totalLiabilities = computed.totalLiabilities

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="card p-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
        <p className="text-red-100 text-sm font-medium mb-1">Total Liabilities</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalLiabilities)}</p>
        <p className="text-red-100 text-xs mt-2">{liabilities.length} liabilit{liabilities.length !== 1 ? 'ies' : 'y'}</p>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Liability
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {liabilities.map(l => {
          const Icon      = TypeIcon(l.type)
          const typeLabel = LIABILITY_TYPES.find(t => t.value === l.type)?.label || l.type
          const sharePct  = totalLiabilities > 0 ? (l.balance / totalLiabilities) * 100 : 0

          return (
            <div key={l.id} className="card p-5 flex flex-col gap-4 relative overflow-hidden">
              {/* Color accent */}
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

              {/* Balance */}
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(l.balance)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Outstanding balance</p>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {l.interestRate   != null && <span>{l.interestRate}% p.a.</span>}
                {l.minimumPayment != null && <span>Min. {formatCurrency(l.minimumPayment)}/mo</span>}
                {l.dueDay         != null && <span>Due on day {l.dueDay}</span>}
              </div>

              {/* Share of total */}
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

      {/* Modal */}
      <Modal isOpen={modal} onClose={close} title={editing ? 'Edit Liability' : 'Add Liability'}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="label">Due Day of Month (optional)</label>
            <input type="number" placeholder="e.g. 15" min="1" max="31" step="1"
              className="input-field" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} />
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Liability'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
