import { useState } from 'react'
import { HiPlus, HiPencil, HiTrash, HiBuildingLibrary, HiWallet, HiBanknotes } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency } from '../utils/formatters'

const ACCOUNT_TYPES = [
  { value: 'bank',   label: 'Bank Account', icon: HiBuildingLibrary },
  { value: 'cash',   label: 'Cash',         icon: HiBanknotes },
  { value: 'wallet', label: 'Digital Wallet', icon: HiWallet },
]

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#3b82f6']

const EMPTY = { name: '', type: 'bank', balance: '', color: '#6366f1' }

export default function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, computed } = useApp()
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function openAdd()  { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  function openEdit(a){ setEditing(a); setForm({ ...a, balance: String(a.balance) }); setError(''); setModal(true) }
  function close()    { setModal(false); setEditing(null); setError('') }
  function set(f, v)  { setForm(p => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = { ...form, balance: parseFloat(form.balance) || 0 }
      if (editing) await updateAccount(data)
      else await addAccount(data)
      close()
    } catch (err) {
      setError(err?.message || 'Failed to save account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const TypeIcon = (type) => ACCOUNT_TYPES.find(t => t.value === type)?.icon || HiBuildingLibrary

  return (
    <div className="space-y-5">
      {/* Total balance header */}
      <div className="card p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <p className="text-indigo-200 text-sm font-medium mb-1">Total Balance</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(computed.totalBalance)}</p>
        <p className="text-indigo-200 text-xs mt-2">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const Icon = TypeIcon(acc.type)
          const typeLabel = ACCOUNT_TYPES.find(t => t.value === acc.type)?.label || acc.type
          return (
            <div key={acc.id} className="card p-5 flex flex-col gap-4 relative overflow-hidden">
              {/* Color accent */}
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: acc.color }} />

              <div className="flex items-start justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${acc.color}18` }}>
                    <Icon className="w-5 h-5" style={{ color: acc.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{acc.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{typeLabel}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(acc)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAccount(acc.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(acc.balance)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Current balance</p>
              </div>

              {/* Share of total */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Share of total</span>
                  <span>{computed.totalBalance > 0 ? Math.round((acc.balance / computed.totalBalance) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${computed.totalBalance > 0 ? (acc.balance / computed.totalBalance) * 100 : 0}%`,
                    background: acc.color
                  }} />
                </div>
              </div>
            </div>
          )
        })}

        {accounts.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3 text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🏦</p>
            <p className="text-sm font-medium">No accounts yet</p>
            <p className="text-xs mt-1">Add your first account to start tracking</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modal} onClose={close} title={editing ? 'Edit Account' : 'Add Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Account Name</label>
            <input type="text" placeholder="e.g. Nabil Bank Savings" required
              className="input-field" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label className="label">Account Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
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
            <label className="label">Current Balance (NPR)</label>
            <input type="number" placeholder="0" min="0" step="1"
              className="input-field" value={form.balance} onChange={e => set('balance', e.target.value)} />
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
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
