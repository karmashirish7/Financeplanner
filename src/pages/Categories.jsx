import { useState } from 'react'
import { HiPlus, HiTrash } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'

const EMOJI_OPTIONS = [
  '🍽️','🚗','🏠','⚡','🛒','🎬','🏥','📚','💆','✈️','🎁','🔧',
  '💰','💻','🏦','📈','🎯','💳','📱','🏋️','🐾','🌿','🎓','👶',
  '🍕','☕','🎮','🎵','🎨','🏖️','🛡️','🧾','🏗️','🚀','🎭','🍜',
]

const COLOR_OPTIONS = [
  '#ef4444','#f97316','#eab308','#84cc16','#10b981',
  '#06b6d4','#3b82f6','#6366f1','#8b5cf6','#ec4899',
  '#e11d48','#f59e0b','#78716c','#0ea5e9','#14b8a6',
]

const EMPTY = { name: '', type: 'expense', icon: '🍽️', color: '#6366f1' }

export default function Categories() {
  const { categories, addCategory, deleteCategory } = useApp()
  const [modal, setModal] = useState(false)
  const [form, setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const income  = categories.filter(c => c.type === 'income')
  const expense = categories.filter(c => c.type === 'expense')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function openAdd(type = 'expense') {
    setForm({ ...EMPTY, type })
    setModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await addCategory({ ...form, name: form.name.trim() })
      setModal(false)
      setForm(EMPTY)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mt-0.5">{categories.length} total categories</p>
        </div>
        <button onClick={() => openAdd('expense')} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <CategorySection
        title="Income"
        badge="bg-emerald-50 text-emerald-700"
        items={income}
        onDelete={deleteCategory}
        onAdd={() => openAdd('income')}
      />

      <CategorySection
        title="Expense"
        badge="bg-red-50 text-red-700"
        items={expense}
        onDelete={deleteCategory}
        onAdd={() => openAdd('expense')}
      />

      {/* Add Category Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Category">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {['expense', 'income'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize
                    ${form.type === t
                      ? t === 'income'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-red-50 border-red-300 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {t === 'income' ? '↑ Income' : '↓ Expense'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Groceries"
              className="input-field"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set('icon', emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                    ${form.icon === emoji
                      ? 'bg-indigo-100 ring-2 ring-indigo-400 scale-110'
                      : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('color', color)}
                  className={`w-8 h-8 rounded-full transition-transform
                    ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${form.color}20` }}
            >
              {form.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{form.name || 'Category name'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ background: form.color }} />
                <p className="text-xs text-gray-400 capitalize">{form.type}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function CategorySection({ title, badge, items, onDelete, onAdd }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge}`}>{title}</span>
          <span className="text-xs text-gray-400">{items.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <HiPlus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-2xl mb-2">🏷️</p>
          <p className="text-sm">No {title.toLowerCase()} categories yet</p>
          <button onClick={onAdd} className="mt-3 text-xs text-indigo-600 hover:underline">
            Add one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(cat => (
            <div
              key={cat.id}
              className="flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 group border-b border-gray-50 last:border-0"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: `${cat.color}20` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
                <div className="w-2 h-2 rounded-full mt-0.5" style={{ background: cat.color }} />
              </div>
              <button
                onClick={() => onDelete(cat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                title="Delete category"
              >
                <HiTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
