import { useState, useMemo } from 'react'
import { HiPlus, HiPencil, HiTrash, HiFunnel, HiArrowTrendingUp, HiArrowTrendingDown } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency, formatDate, todayISO } from '../utils/formatters'

const EMPTY = { type: 'expense', amount: '', accountId: '', categoryId: '', date: todayISO(), notes: '', isRecurring: false }

export default function Transactions() {
  const { transactions, categories, accounts, addTransaction, updateTransaction, deleteTransaction } = useApp()

  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [filter, setFilter]     = useState({ type: 'all', categoryId: '', search: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  function openAdd() { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  function openEdit(t) { setEditing(t); setForm({ ...t, amount: String(t.amount) }); setError(''); setModal(true) }
  function close() { setModal(false); setEditing(null); setError('') }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.accountId || !form.categoryId || !form.date) return
    setSaving(true)
    setError('')
    try {
      const data = { ...form, amount: parseFloat(form.amount) }
      if (editing) await updateTransaction(data)
      else await addTransaction(data)
      close()
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    return [...transactions]
      .filter(t => {
        if (filter.type !== 'all' && t.type !== filter.type) return false
        if (filter.categoryId && t.categoryId !== filter.categoryId) return false
        if (filter.search) {
          const q = filter.search.toLowerCase()
          const cat = categories.find(c => c.id === t.categoryId)
          if (!t.notes?.toLowerCase().includes(q) && !cat?.name?.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [transactions, filter, categories])

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats  = categories.filter(c => c.type === 'income')
  const formCats    = form.type === 'income' ? incomeCats : expenseCats
  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <HiArrowTrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Income</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <HiArrowTrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="text-sm font-bold text-red-500">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-bold text-sm">≡</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net</p>
            <p className={`text-sm font-bold ${totalIncome - totalExpense >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Type filter */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {['all','income','expense'].map(t => (
                <button key={t} onClick={() => setFilter(f => ({ ...f, type: t }))}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                    ${filter.type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <select className="input-field w-auto text-xs py-1.5"
              value={filter.categoryId}
              onChange={e => setFilter(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              className="input-field w-36 text-xs py-1.5"
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 flex-shrink-0">
            <HiPlus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium">No transactions found</p>
            <p className="text-xs mt-1">Try adjusting filters or add a new transaction</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500">Account</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500">Notes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId)
                  const acc = accounts.find(a => a.id === t.accountId)
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat?.icon || '💳'}</span>
                          <span className="font-medium text-gray-900 truncate max-w-[90px] sm:max-w-none">{cat?.name || '—'}</span>
                          {t.isRecurring && <span className="hidden sm:inline badge bg-indigo-50 text-indigo-600">↻</span>}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-500 text-xs">{acc?.name || '—'}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{t.notes || '—'}</td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        <span className={t.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modal} onClose={close} title={editing ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {['expense','income'].map(t => (
                <button key={t} type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize
                    ${form.type === t
                      ? t === 'income' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {t === 'income' ? '↑ Income' : '↓ Expense'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (NPR)</label>
              <input type="number" placeholder="0" min="1" step="1" required
                className="input-field" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" required className="input-field" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select required className="input-field" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              <option value="">Select category</option>
              {formCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Account</label>
            <select required className="input-field" value={form.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" placeholder="Add a note..." className="input-field"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurring" checked={form.isRecurring}
              onChange={e => set('isRecurring', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="recurring" className="text-sm text-gray-700">Recurring monthly</label>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={close} disabled={saving} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
