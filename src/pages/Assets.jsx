import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency, formatDate } from '../utils/formatters'
import { HiPlus, HiPencil, HiTrash, HiChartPie, HiArrowPath } from 'react-icons/hi2'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export const ASSET_TYPES = [
  { value: 'gold',       label: 'Gold',            icon: '🥇', color: '#f59e0b' },
  { value: 'silver',     label: 'Silver',          icon: '🥈', color: '#9ca3af' },
  { value: 'property',   label: 'Property / Land', icon: '🏠', color: '#10b981' },
  { value: 'stocks',     label: 'Stocks / Shares', icon: '📈', color: '#3b82f6' },
  { value: 'business',   label: 'Business',        icon: '🏪', color: '#f97316' },
  { value: 'crypto',     label: 'Cryptocurrency',  icon: '₿',  color: '#8b5cf6' },
  { value: 'investment', label: 'Mutual Funds',    icon: '💹', color: '#6366f1' },
  { value: 'savings',    label: 'Fixed Deposit',   icon: '🏦', color: '#14b8a6' },
  { value: 'vehicle',    label: 'Vehicle',         icon: '🚗', color: '#06b6d4' },
  { value: 'other',      label: 'Other',           icon: '📦', color: '#6b7280' },
]

export function assetMeta(type) {
  return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[ASSET_TYPES.length - 1]
}

const METAL_TYPES = ['gold', 'silver']
const EMPTY_FORM  = { name: '', type: 'other', value: '', quantityTola: '', rateMode: 'auto' }

export default function Assets() {
  const { assets, addAsset, updateAsset, deleteAsset, metalRates, refreshMetalRates } = useApp()

  const [modal,      setModal]      = useState(null)   // null | 'add' | 'edit' | 'delete'
  const [selected,   setSelected]   = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [busy,       setBusy]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState('')
  const [filterType, setFilterType] = useState('all')

  // ── Derived from form ──────────────────────────────────────
  const isMetalType   = METAL_TYPES.includes(form.type)
  const currentRate   = isMetalType ? metalRates?.[form.type]?.ratePerTola : null
  const estimatedValue =
    isMetalType && form.rateMode === 'auto' && form.quantityTola && currentRate
      ? Math.round(parseFloat(form.quantityTola) * currentRate)
      : null

  // ── Summary ────────────────────────────────────────────────
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)
  const largest     = assets.reduce((mx, a) => a.value > (mx?.value ?? 0) ? a : mx, null)

  const byType = ASSET_TYPES.map(t => ({
    ...t,
    total: assets.filter(a => a.type === t.value).reduce((s, a) => s + a.value, 0),
  })).filter(t => t.total > 0)

  const filtered = filterType === 'all' ? assets : assets.filter(a => a.type === filterType)

  // ── Handlers ───────────────────────────────────────────────
  function openAdd() {
    setForm(EMPTY_FORM)
    setError('')
    setModal('add')
  }

  function openEdit(asset) {
    setSelected(asset)
    const hasTola = asset.quantityTola != null && Number(asset.quantityTola) > 0
    setForm({
      name:         asset.name,
      type:         asset.type,
      value:        String(asset.value),
      quantityTola: hasTola ? String(asset.quantityTola) : '',
      rateMode:     hasTola ? (asset.rateMode || 'auto') : 'manual',
    })
    setError('')
    setModal('edit')
  }

  function openDelete(asset) {
    setSelected(asset)
    setModal('delete')
  }

  function set(field, value) {
    setForm(f => {
      const update = { ...f, [field]: value }
      // Auto-switch to 'auto' rate mode when selecting a metal type
      if (field === 'type' && METAL_TYPES.includes(value)) update.rateMode = 'auto'
      return update
    })
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('Name is required.')

    let payload

    if (isMetalType) {
      const qty = form.quantityTola ? parseFloat(form.quantityTola) : NaN

      if (form.rateMode === 'auto') {
        if (!form.quantityTola || isNaN(qty) || qty <= 0)
          return setError('Enter a valid quantity in tola.')
        if (!currentRate)
          return setError('No rate available yet. Click "Refresh Rates" first, or switch to Manual mode.')
        payload = {
          name:         form.name.trim(),
          type:         form.type,
          value:        Math.round(qty * currentRate),
          quantityTola: qty,
          rateMode:     'auto',
        }
      } else {
        // manual mode
        const val = parseFloat(form.value)
        if (!form.value || isNaN(val) || val < 0)
          return setError('Enter a valid value.')
        payload = {
          name:         form.name.trim(),
          type:         form.type,
          value:        val,
          quantityTola: !isNaN(qty) && qty > 0 ? qty : null,
          rateMode:     'manual',
        }
      }
    } else {
      const val = parseFloat(form.value)
      if (!form.value || isNaN(val) || val < 0)
        return setError('Enter a valid value (0 or more).')
      payload = { name: form.name.trim(), type: form.type, value: val }
    }

    setBusy(true)
    try {
      if (modal === 'add') await addAsset(payload)
      else                 await updateAsset({ ...selected, ...payload })
      setModal(null)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await deleteAsset(selected.id)
      setModal(null)
    } catch (err) {
      setError(err.message || 'Delete failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRefreshRates() {
    setRefreshing(true)
    setError('')
    try {
      await refreshMetalRates()
    } catch (err) {
      setError(err.message || 'Rate refresh failed. Make sure the edge function is deployed.')
    } finally {
      setRefreshing(false)
    }
  }

  // ── Metal Rate Badge ───────────────────────────────────────
  const hasRates = metalRates?.gold || metalRates?.silver

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your wealth — gold, property, stocks &amp; more</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <HiPlus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {/* Metal Rates Banner */}
      <div className={`card p-4 border ${hasRates ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-5 flex-wrap">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              fenegosida.org Rates
            </span>
            {metalRates?.gold ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🥇</span>
                <div>
                  <p className="text-[10px] text-gray-400 leading-none">Fine Gold / tola</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(metalRates.gold.ratePerTola)}</p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-400">🥇 Gold — not fetched</span>
            )}
            {metalRates?.silver ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🥈</span>
                <div>
                  <p className="text-[10px] text-gray-400 leading-none">Silver / tola</p>
                  <p className="text-sm font-bold text-gray-600">{formatCurrency(metalRates.silver.ratePerTola)}</p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-400">🥈 Silver — not fetched</span>
            )}
            {metalRates?.gold && (
              <span className="text-[10px] text-gray-400">
                Updated: {metalRates.gold.date} · auto-refreshes 11 AM NPT
              </span>
            )}
          </div>

          <button
            onClick={handleRefreshRates}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <HiArrowPath className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Fetching…' : 'Refresh Rates'}
          </button>
        </div>
        {error && !modal && (
          <p className="text-xs text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">{error}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total Asset Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAssets)}</p>
          <p className="text-xs text-gray-400 mt-1">{assets.length} asset{assets.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Largest Asset</p>
          {largest ? (
            <>
              <p className="text-xl font-bold text-gray-900 truncate">{largest.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{formatCurrency(largest.value)} · {assetMeta(largest.type).label}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-1">No assets yet</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Asset Categories</p>
          <p className="text-2xl font-bold text-gray-900">{byType.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {byType.slice(0, 3).map(t => t.label).join(', ')}{byType.length > 3 ? ` +${byType.length - 3} more` : ''}
          </p>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🏦</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No assets yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            Start recording your wealth — gold, property, stocks, FDs, businesses and more.
          </p>
          <button onClick={openAdd} className="btn-primary mx-auto flex items-center gap-2 w-fit">
            <HiPlus className="w-4 h-4" />
            Add Your First Asset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Asset list (left 2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Type filter pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors border
                  ${filterType === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                All ({assets.length})
              </button>
              {byType.map(t => (
                <button
                  key={t.value}
                  onClick={() => setFilterType(filterType === t.value ? 'all' : t.value)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors border
                    ${filterType === t.value ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                  style={filterType === t.value ? { background: t.color, borderColor: t.color } : {}}
                >
                  {t.icon} {t.label} ({assets.filter(a => a.type === t.value).length})
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No assets in this category.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(asset => {
                  const meta = assetMeta(asset.type)
                  const pct  = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0
                  const isMetal = METAL_TYPES.includes(asset.type)
                  const hasTola = isMetal && asset.quantityTola != null && asset.quantityTola > 0
                  const liveRate = isMetal ? metalRates?.[asset.type]?.ratePerTola : null

                  return (
                    <div key={asset.id} className="card p-4 flex flex-col gap-3">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: meta.color + '20' }}
                          >
                            {meta.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{asset.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: meta.color + '20', color: meta.color }}
                              >
                                {meta.label}
                              </span>
                              {isMetal && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  asset.rateMode === 'auto'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {asset.rateMode === 'auto' ? '🔄 Auto' : '✏️ Manual'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEdit(asset)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <HiPencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDelete(asset)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <HiTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Value */}
                      <div>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(asset.value)}</p>
                        {hasTola && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {asset.quantityTola} tola
                            {liveRate && asset.rateMode === 'auto'
                              ? ` · ${formatCurrency(liveRate)}/tola`
                              : asset.rateMode === 'manual' && asset.quantityTola
                              ? ` · ${formatCurrency(Math.round(asset.value / asset.quantityTola))}/tola (manual)`
                              : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${pct}%`, background: meta.color }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">{pct.toFixed(1)}%</span>
                        </div>
                      </div>

                      {asset.updatedAt && (
                        <p className="text-xs text-gray-400">Updated {formatDate(asset.updatedAt.split('T')[0])}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Portfolio pie (right 1/3) */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <HiChartPie className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-900">Portfolio Breakdown</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byType} dataKey="total" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {byType.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {byType.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                      <span className="text-gray-600">{t.icon} {t.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{totalAssets > 0 ? Math.round((t.total / totalAssets) * 100) : 0}%</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(t.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4 bg-indigo-50 border-0">
              <p className="text-xs font-semibold text-indigo-700 mb-1">💡 Diversification Tip</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                A well-diversified portfolio typically has assets across property, equities (stocks/funds),
                precious metals, and liquid savings. Use the AI Planner for personalized advice.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      <Modal
        isOpen={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Asset' : 'Edit Asset'}
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="label">Asset Name</label>
            <input
              type="text"
              placeholder="e.g. My Gold, Sunrise Bank Shares, Pokhara Land"
              className="input-field"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Type */}
          <div>
            <label className="label">Asset Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ASSET_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left
                    ${form.type === t.value
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'}`}
                  style={form.type === t.value ? { background: t.color, borderColor: t.color } : {}}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Gold / Silver specific fields ── */}
          {isMetalType ? (
            <>
              {/* Quantity in tola */}
              <div>
                <label className="label">Quantity (Tola)</label>
                <input
                  type="number"
                  placeholder="e.g. 5 or 2.5"
                  min="0"
                  step="0.001"
                  className="input-field"
                  value={form.quantityTola}
                  onChange={e => set('quantityTola', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">1 tola = 11.664 g · required for Auto rate mode</p>
              </div>

              {/* Rate Mode */}
              <div>
                <label className="label">Valuation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => set('rateMode', 'auto')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${form.rateMode === 'auto'
                        ? 'border-green-400 bg-green-50 text-green-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}
                  >
                    <HiArrowPath className="w-4 h-4 flex-shrink-0" />
                    <span>Auto Rate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set('rateMode', 'manual')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${form.rateMode === 'manual'
                        ? 'border-orange-400 bg-orange-50 text-orange-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}
                  >
                    <HiPencil className="w-4 h-4 flex-shrink-0" />
                    <span>Manual Entry</span>
                  </button>
                </div>
              </div>

              {/* Auto mode: show live rate + estimated value */}
              {form.rateMode === 'auto' ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-amber-800">
                      {form.type === 'gold' ? '🥇 Fine Gold' : '🥈 Silver'} rate (fenegosida.org)
                    </span>
                    {currentRate ? (
                      <span className="text-sm font-bold text-amber-800">{formatCurrency(currentRate)}/tola</span>
                    ) : (
                      <span className="text-xs text-amber-600 italic">Not fetched — click Refresh Rates</span>
                    )}
                  </div>
                  {estimatedValue != null && (
                    <div className="flex justify-between items-center border-t border-amber-200 pt-2">
                      <span className="text-xs text-amber-700">
                        {form.quantityTola} tola × {formatCurrency(currentRate)}
                      </span>
                      <span className="text-sm font-bold text-amber-900">{formatCurrency(estimatedValue)}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-amber-600">
                    Value auto-updates every day at 11 AM NPT from fenegosida.org
                  </p>
                </div>
              ) : (
                /* Manual mode: value input */
                <div>
                  <label className="label">Current Value (NPR)</label>
                  <input
                    type="number"
                    placeholder="Enter value manually"
                    min="0"
                    className="input-field"
                    value={form.value}
                    onChange={e => set('value', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    You control this value. Switch to Auto Rate to let fenegosida.org update it daily.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Non-metal assets: plain value input */
            <div>
              <label className="label">Current Market Value (NPR)</label>
              <input
                type="number"
                placeholder="350000"
                min="0"
                className="input-field"
                value={form.value}
                onChange={e => set('value', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Enter the current estimated value at today's price.</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={busy} className="btn-primary flex-1">
              {busy
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                : modal === 'add' ? 'Add Asset' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────── */}
      <Modal
        isOpen={modal === 'delete'}
        onClose={() => setModal(null)}
        title="Delete Asset"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-5">
          Remove <span className="font-semibold">{selected?.name}</span> ({formatCurrency(selected?.value || 0)}) from your portfolio?
          This cannot be undone.
        </p>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} disabled={busy} className="btn-danger flex-1">
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
