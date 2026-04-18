import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import { formatCurrency, formatDate } from '../utils/formatters'
import { HiPlus, HiPencil, HiTrash, HiChartPie, HiArrowPath, HiArrowTrendingUp, HiArrowTrendingDown, HiMagnifyingGlass } from 'react-icons/hi2'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { NEPSE_STOCKS } from '../data/nepseStocks'

export const ASSET_TYPES = [
  { value: 'gold',       label: 'Gold',            icon: '🥇', color: '#f59e0b', group: 'metal' },
  { value: 'silver',     label: 'Silver',          icon: '🥈', color: '#9ca3af', group: 'metal' },
  { value: 'stocks',     label: 'Stocks / Shares', icon: '📈', color: '#3b82f6', group: 'stock' },
  { value: 'property',   label: 'Property / Land', icon: '🏠', color: '#10b981', group: 'other' },
  { value: 'business',   label: 'Business',        icon: '🏪', color: '#f97316', group: 'other' },
  { value: 'crypto',     label: 'Cryptocurrency',  icon: '₿',  color: '#8b5cf6', group: 'other' },
  { value: 'investment', label: 'Mutual Funds',    icon: '💹', color: '#6366f1', group: 'other' },
  { value: 'savings',    label: 'Fixed Deposit',   icon: '🏦', color: '#14b8a6', group: 'other' },
  { value: 'vehicle',    label: 'Vehicle',         icon: '🚗', color: '#06b6d4', group: 'other' },
  { value: 'other',      label: 'Other',           icon: '📦', color: '#6b7280', group: 'other' },
]

export function assetMeta(type) {
  return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[ASSET_TYPES.length - 1]
}

const METAL_TYPES = ['gold', 'silver']
const OTHER_TYPES = ASSET_TYPES.filter(t => t.group === 'other').map(t => t.value)

const EMPTY_FORM = {
  name: '', type: 'other', value: '',
  quantityTola: '', rateMode: 'auto', commissionPct: '',
  purchasePrice: '', shares: '', pricePerShare: '', currentPricePerShare: '',
}

const TABS = [
  { id: 'metals', label: '🥇 Metals' },
  { id: 'stocks', label: '📈 Stocks' },
  { id: 'others', label: '🏠 Others' },
]

function pnlColor(pnl) {
  return pnl > 0 ? 'text-emerald-600' : pnl < 0 ? 'text-red-500' : 'text-gray-500'
}
function pnlBg(pnl) {
  return pnl > 0 ? 'bg-emerald-50' : pnl < 0 ? 'bg-red-50' : 'bg-gray-50'
}

function StockPicker({ value, onChange, onSelect }) {
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const wrapRef = useRef(null)

  const results = query.trim().length < 1 ? [] : NEPSE_STOCKS.filter(s => {
    const q = query.toLowerCase()
    return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  }).slice(0, 10)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(stock) {
    onSelect(stock)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="space-y-2">
      {/* Search box */}
      <div>
        <label className="label">Stock Name / Symbol</label>
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search NEPSE — e.g. NABIL, Kumari, Hydro…"
            className="input-field pl-9"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => query && setOpen(true)}
          />
        </div>
        {open && results.length > 0 && (
          <div className="mt-1 border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden z-10 relative">
            {results.map(s => (
              <button
                key={s.symbol}
                type="button"
                onMouseDown={() => pick(s)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className="text-sm font-bold text-gray-900">{s.symbol}</span>
                  <span className="text-xs text-gray-400 ml-2 truncate">{s.name}</span>
                </div>
                <span className="text-xs font-semibold text-indigo-600 flex-shrink-0 ml-2">
                  {formatCurrency(s.lastPrice)}
                </span>
              </button>
            ))}
          </div>
        )}
        {open && query.trim().length >= 1 && results.length === 0 && (
          <p className="mt-1 text-xs text-gray-400 px-1">No matching NEPSE stock found.</p>
        )}
      </div>

      {/* Selected / manual name field */}
      <div>
        <label className="label">Stock Name (editable)</label>
        <input
          type="text"
          placeholder="e.g. NABIL or type manually"
          className="input-field"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Search above to pick from NEPSE list, or type any name.</p>
      </div>
    </div>
  )
}

export default function Assets() {
  const { assets, addAsset, updateAsset, deleteAsset, metalRates, refreshMetalRates } = useApp()

  const [tab,        setTab]        = useState('metals')
  const [modal,      setModal]      = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [busy,       setBusy]       = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState('')

  // ── Asset groups ───────────────────────────────────────────
  const metalAssets = assets.filter(a => METAL_TYPES.includes(a.type))
  const stockAssets = assets.filter(a => a.type === 'stocks')
  const otherAssets = assets.filter(a => OTHER_TYPES.includes(a.type))
  const totalAssets = assets.reduce((s, a) => s + a.value, 0)

  // Metals
  const metalCurrentValue = metalAssets.reduce((s, a) => s + a.value, 0)

  // Stocks summary
  const stocksCurrentValue  = stockAssets.reduce((s, a) => s + a.value, 0)
  const stocksTotalInvested = stockAssets.reduce((s, a) =>
    s + (a.quantityTola && a.purchasePrice ? a.quantityTola * a.purchasePrice : 0), 0)
  const stocksPnL = stocksCurrentValue - stocksTotalInvested

  // Others summary
  const otherCurrentValue  = otherAssets.reduce((s, a) => s + a.value, 0)
  const otherTotalCost     = otherAssets.reduce((s, a) => s + (a.purchasePrice || 0), 0)

  // Pie data
  const byType = ASSET_TYPES.map(t => ({
    ...t, total: assets.filter(a => a.type === t.value).reduce((s, a) => s + a.value, 0),
  })).filter(t => t.total > 0)

  // ── Form derived ───────────────────────────────────────────
  const isMetalType = METAL_TYPES.includes(form.type)
  const isStockType = form.type === 'stocks'
  const currentRate = isMetalType ? metalRates?.[form.type]?.ratePerTola : null

  const estimatedMetalValue =
    isMetalType && form.rateMode === 'auto' && form.quantityTola && currentRate
      ? Math.round(parseFloat(form.quantityTola) * currentRate) : null

  const estimatedStockValue =
    isStockType && form.shares && form.currentPricePerShare
      ? Math.round(parseFloat(form.shares) * parseFloat(form.currentPricePerShare)) : null

  const estimatedStockInvested =
    isStockType && form.shares && form.pricePerShare
      ? Math.round(parseFloat(form.shares) * parseFloat(form.pricePerShare)) : null

  // ── Handlers ───────────────────────────────────────────────
  function openAdd() {
    const defaultType = tab === 'metals' ? 'gold' : tab === 'stocks' ? 'stocks' : 'property'
    setForm({ ...EMPTY_FORM, type: defaultType, rateMode: tab === 'metals' ? 'auto' : 'manual' })
    setError('')
    setModal('add')
  }

  function openEdit(asset) {
    setSelected(asset)
    const isMetal = METAL_TYPES.includes(asset.type)
    const isStock = asset.type === 'stocks'
    const hasTola = asset.quantityTola != null && Number(asset.quantityTola) > 0

    const f = {
      ...EMPTY_FORM,
      name:          asset.name,
      type:          asset.type,
      value:         String(asset.value),
      commissionPct: asset.commissionPct != null ? String(asset.commissionPct) : '',
      purchasePrice: asset.purchasePrice != null ? String(asset.purchasePrice) : '',
    }

    if (isMetal) {
      f.quantityTola = hasTola ? String(asset.quantityTola) : ''
      f.rateMode     = hasTola ? (asset.rateMode || 'auto') : 'manual'
    } else if (isStock) {
      f.shares               = hasTola ? String(asset.quantityTola) : ''
      f.pricePerShare        = asset.purchasePrice != null ? String(asset.purchasePrice) : ''
      f.currentPricePerShare = hasTola && asset.value
        ? String(Math.round(asset.value / Number(asset.quantityTola))) : ''
    }

    setForm(f)
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
      if (field === 'type') update.rateMode = METAL_TYPES.includes(value) ? 'auto' : 'manual'
      return update
    })
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('Name is required.')

    const commissionPct = form.commissionPct !== '' ? parseFloat(form.commissionPct) : null
    if (commissionPct !== null && (isNaN(commissionPct) || commissionPct < 0 || commissionPct > 100))
      return setError('Commission must be between 0 and 100.')

    let payload

    if (isMetalType) {
      const qty = form.quantityTola ? parseFloat(form.quantityTola) : NaN
      if (form.rateMode === 'auto') {
        if (!form.quantityTola || isNaN(qty) || qty <= 0)
          return setError('Enter a valid quantity in tola.')
        if (!currentRate)
          return setError('No rate available. Click "Refresh Rates" first, or switch to Manual mode.')
        payload = { name: form.name.trim(), type: form.type, value: Math.round(qty * currentRate), quantityTola: qty, rateMode: 'auto', commissionPct }
      } else {
        const val = parseFloat(form.value)
        if (!form.value || isNaN(val) || val < 0)
          return setError('Enter a valid value.')
        payload = { name: form.name.trim(), type: form.type, value: val, quantityTola: !isNaN(qty) && qty > 0 ? qty : null, rateMode: 'manual', commissionPct }
      }
    } else if (isStockType) {
      const shares = parseFloat(form.shares)
      const pricePerShare = parseFloat(form.pricePerShare)
      const currentPricePerShare = parseFloat(form.currentPricePerShare)
      if (!form.shares || isNaN(shares) || shares <= 0)
        return setError('Enter the number of shares.')
      if (!form.currentPricePerShare || isNaN(currentPricePerShare) || currentPricePerShare <= 0)
        return setError('Enter the current price per share.')
      const value = Math.round(shares * currentPricePerShare)
      const purchasePrice = !isNaN(pricePerShare) && pricePerShare > 0 ? pricePerShare : null
      payload = { name: form.name.trim(), type: 'stocks', value, quantityTola: shares, purchasePrice, commissionPct }
    } else {
      const val = parseFloat(form.value)
      if (!form.value || isNaN(val) || val < 0)
        return setError('Enter a valid current value.')
      const purchasePrice = form.purchasePrice !== '' ? parseFloat(form.purchasePrice) : null
      if (purchasePrice !== null && (isNaN(purchasePrice) || purchasePrice < 0))
        return setError('Enter a valid purchase price.')
      payload = { name: form.name.trim(), type: form.type, value: val, purchasePrice, commissionPct: null }
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

  const hasRates = metalRates?.gold || metalRates?.silver

  // ── Shared asset card actions ──────────────────────────────
  function ActionBtns({ asset }) {
    return (
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => openEdit(asset)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <HiPencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => openDelete(asset)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <HiTrash className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Total header */}
      <div className="card p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
        <p className="text-indigo-200 text-sm font-medium mb-1">Total Asset Value</p>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(totalAssets)}</p>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-indigo-300 text-xs">Metals</p>
            <p className="text-sm font-semibold">{formatCurrency(metalCurrentValue)}</p>
          </div>
          <div>
            <p className="text-indigo-300 text-xs">Stocks</p>
            <p className="text-sm font-semibold">{formatCurrency(stocksCurrentValue)}</p>
          </div>
          <div>
            <p className="text-indigo-300 text-xs">Others</p>
            <p className="text-sm font-semibold">{formatCurrency(otherCurrentValue)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-all ${
              tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── METALS TAB ─────────────────────────────────────────── */}
      {tab === 'metals' && (
        <div className="space-y-4">
          {/* Rates banner */}
          <div className={`card p-4 border ${hasRates ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-5 flex-wrap">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">fenegosida.org Rates</span>
                {metalRates?.gold ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🥇</span>
                    <div>
                      <p className="text-[10px] text-gray-400 leading-none">Fine Gold / tola</p>
                      <p className="text-sm font-bold text-amber-700">{formatCurrency(metalRates.gold.ratePerTola)}</p>
                    </div>
                  </div>
                ) : <span className="text-xs text-gray-400">🥇 Gold — not fetched</span>}
                {metalRates?.silver ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🥈</span>
                    <div>
                      <p className="text-[10px] text-gray-400 leading-none">Silver / tola</p>
                      <p className="text-sm font-bold text-gray-600">{formatCurrency(metalRates.silver.ratePerTola)}</p>
                    </div>
                  </div>
                ) : <span className="text-xs text-gray-400">🥈 Silver — not fetched</span>}
                {metalRates?.gold && (
                  <span className="text-[10px] text-gray-400">Updated: {metalRates.gold.date} · auto-refreshes 11 AM NPT</span>
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
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {metalAssets.length} metal asset{metalAssets.length !== 1 ? 's' : ''} · {formatCurrency(metalCurrentValue)}
            </p>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Add Metal
            </button>
          </div>

          {metalAssets.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">🥇</div>
              <p className="text-sm font-medium text-gray-700">No metals recorded</p>
              <p className="text-xs text-gray-400 mt-1">Track your gold and silver holdings</p>
              <button onClick={openAdd} className="btn-primary mt-4 mx-auto flex items-center gap-2 w-fit">
                <HiPlus className="w-4 h-4" /> Add Metal Asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metalAssets.map(asset => {
                const meta    = assetMeta(asset.type)
                const hasTola = asset.quantityTola != null && asset.quantityTola > 0
                const liveRate = metalRates?.[asset.type]?.ratePerTola
                const pct     = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0
                return (
                  <div key={asset.id} className="card p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: meta.color + '20' }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{asset.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: meta.color + '20', color: meta.color }}>{meta.label}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${asset.rateMode === 'auto' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {asset.rateMode === 'auto' ? '🔄 Auto' : '✏️ Manual'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ActionBtns asset={asset} />
                    </div>
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
                      {asset.commissionPct != null && (
                        <div className="mt-1.5 flex items-center justify-between bg-emerald-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs text-emerald-700">After {asset.commissionPct}% commission</span>
                          <span className="text-sm font-bold text-emerald-700">{formatCurrency(Math.round(asset.value * (1 - asset.commissionPct / 100)))}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{pct.toFixed(1)}% of total</span>
                      </div>
                    </div>
                    {asset.updatedAt && <p className="text-xs text-gray-400">Updated {formatDate(asset.updatedAt.split('T')[0])}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STOCKS TAB ─────────────────────────────────────────── */}
      {tab === 'stocks' && (
        <div className="space-y-4">
          {stockAssets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stocksTotalInvested)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stocksCurrentValue)}</p>
              </div>
              <div className={`card p-4 ${pnlBg(stocksPnL)}`}>
                <p className="text-xs text-gray-500 font-medium mb-1">Overall P&amp;L</p>
                <p className={`text-2xl font-bold ${pnlColor(stocksPnL)}`}>
                  {stocksPnL >= 0 ? '+' : ''}{formatCurrency(stocksPnL)}
                </p>
                {stocksTotalInvested > 0 && (
                  <p className={`text-xs mt-1 font-medium ${pnlColor(stocksPnL)}`}>
                    {stocksPnL >= 0 ? '+' : ''}{((stocksPnL / stocksTotalInvested) * 100).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{stockAssets.length} stock{stockAssets.length !== 1 ? 's' : ''}</p>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Add Stock
            </button>
          </div>

          {stockAssets.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">📈</div>
              <p className="text-sm font-medium text-gray-700">No stocks recorded</p>
              <p className="text-xs text-gray-400 mt-1">Track your share investments and P&amp;L</p>
              <button onClick={openAdd} className="btn-primary mt-4 mx-auto flex items-center gap-2 w-fit">
                <HiPlus className="w-4 h-4" /> Add Stock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stockAssets.map(asset => {
                const meta = assetMeta(asset.type)
                const shares = asset.quantityTola
                const purchasePricePerShare = asset.purchasePrice
                const totalInvested = shares && purchasePricePerShare ? shares * purchasePricePerShare : null
                const currentPricePerShare = shares ? Math.round(asset.value / shares) : null
                const pnl = totalInvested != null ? asset.value - totalInvested : null
                const pnlPct = totalInvested ? (pnl / totalInvested) * 100 : null
                const netValue = asset.commissionPct != null ? Math.round(asset.value * (1 - asset.commissionPct / 100)) : null
                const pct = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0

                return (
                  <div key={asset.id} className="card p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: meta.color + '20' }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{asset.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {shares ? `${shares} shares` : 'Stocks'}
                            {purchasePricePerShare ? ` · avg ${formatCurrency(purchasePricePerShare)}/share` : ''}
                          </p>
                        </div>
                      </div>
                      <ActionBtns asset={asset} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">Invested</p>
                        <p className="text-sm font-bold text-gray-900">{totalInvested != null ? formatCurrency(totalInvested) : '—'}</p>
                        {purchasePricePerShare && <p className="text-[10px] text-gray-400">{formatCurrency(purchasePricePerShare)}/share</p>}
                      </div>
                      <div className="bg-blue-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">Current</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(asset.value)}</p>
                        {currentPricePerShare && <p className="text-[10px] text-gray-400">{formatCurrency(currentPricePerShare)}/share</p>}
                      </div>
                    </div>

                    {pnl != null && (
                      <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${pnlBg(pnl)}`}>
                        <div className="flex items-center gap-1.5">
                          {pnl >= 0
                            ? <HiArrowTrendingUp className={`w-4 h-4 ${pnlColor(pnl)}`} />
                            : <HiArrowTrendingDown className={`w-4 h-4 ${pnlColor(pnl)}`} />}
                          <span className={`text-xs font-medium ${pnlColor(pnl)}`}>{pnl >= 0 ? 'Gain' : 'Loss'}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</p>
                          {pnlPct != null && <p className={`text-[10px] ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</p>}
                        </div>
                      </div>
                    )}

                    {netValue != null && (
                      <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-emerald-700">After {asset.commissionPct}% commission</span>
                        <span className="text-sm font-bold text-emerald-700">{formatCurrency(netValue)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{pct.toFixed(1)}% of total</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── OTHERS TAB ─────────────────────────────────────────── */}
      {tab === 'others' && (
        <div className="space-y-4">
          {otherAssets.length > 0 && otherTotalCost > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Purchase Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(otherTotalCost)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(otherCurrentValue)}</p>
              </div>
              <div className={`card p-4 ${pnlBg(otherCurrentValue - otherTotalCost)}`}>
                <p className="text-xs text-gray-500 font-medium mb-1">Net Change</p>
                {(() => {
                  const pnl = otherCurrentValue - otherTotalCost
                  const pct = otherTotalCost > 0 ? (pnl / otherTotalCost) * 100 : 0
                  return (
                    <>
                      <p className={`text-2xl font-bold ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</p>
                      <p className={`text-xs mt-1 font-medium ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}{pct.toFixed(2)}%</p>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {otherAssets.length} asset{otherAssets.length !== 1 ? 's' : ''} · {formatCurrency(otherCurrentValue)}
            </p>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <HiPlus className="w-4 h-4" /> Add Asset
            </button>
          </div>

          {otherAssets.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">🏠</div>
              <p className="text-sm font-medium text-gray-700">No other assets recorded</p>
              <p className="text-xs text-gray-400 mt-1">Track property, vehicles, businesses, FDs and more</p>
              <button onClick={openAdd} className="btn-primary mt-4 mx-auto flex items-center gap-2 w-fit">
                <HiPlus className="w-4 h-4" /> Add Asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {otherAssets.map(asset => {
                const meta = assetMeta(asset.type)
                const purchasePrice = asset.purchasePrice
                const pnl = purchasePrice != null ? asset.value - purchasePrice : null
                const pnlPct = purchasePrice && purchasePrice > 0
                  ? ((asset.value - purchasePrice) / purchasePrice) * 100 : null
                const pct = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0

                return (
                  <div key={asset.id} className="card p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: meta.color + '20' }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{asset.name}</p>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: meta.color + '20', color: meta.color }}>{meta.label}</span>
                        </div>
                      </div>
                      <ActionBtns asset={asset} />
                    </div>

                    <div className={`grid gap-2 ${purchasePrice != null ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {purchasePrice != null && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400 mb-0.5">Purchased At</p>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(purchasePrice)}</p>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-400 mb-0.5">Current Value</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(asset.value)}</p>
                      </div>
                    </div>

                    {pnl != null && (
                      <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${pnlBg(pnl)}`}>
                        <div className="flex items-center gap-1.5">
                          {pnl >= 0
                            ? <HiArrowTrendingUp className={`w-4 h-4 ${pnlColor(pnl)}`} />
                            : <HiArrowTrendingDown className={`w-4 h-4 ${pnlColor(pnl)}`} />}
                          <span className={`text-xs font-medium ${pnlColor(pnl)}`}>Value Change</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</p>
                          {pnlPct != null && <p className={`text-[10px] ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</p>}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{pct.toFixed(1)}% of total</span>
                    </div>

                    {asset.updatedAt && <p className="text-xs text-gray-400">Updated {formatDate(asset.updatedAt.split('T')[0])}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Portfolio Pie (shown when assets exist, below tabs) ── */}
      {assets.length > 0 && byType.length > 1 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HiChartPie className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Portfolio Breakdown</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byType} dataKey="total" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {byType.map((t, i) => <Cell key={i} fill={t.color} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 sm:min-w-48">
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
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────── */}
      <Modal
        isOpen={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Asset' : 'Edit Asset'}
        size="md"
      >
        <div className="space-y-4">
          {/* Name — stock tab shows NEPSE picker */}
          {isStockType ? (
            <StockPicker
              value={form.name}
              onChange={name => set('name', name)}
              onSelect={(stock) => {
                setForm(f => ({
                  ...f,
                  name: stock.symbol,
                  currentPricePerShare: String(stock.lastPrice),
                }))
                setError('')
              }}
            />
          ) : (
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                placeholder={isMetalType ? 'e.g. My Gold, Inherited Silver' : 'e.g. Pokhara Land, Honda Activa'}
                className="input-field"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
          )}

          {/* Type selector — filtered by current tab */}
          {!isStockType && (
            <div>
              <label className="label">Asset Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ASSET_TYPES
                  .filter(t => tab === 'metals' ? t.group === 'metal' : t.group === 'other')
                  .map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('type', t.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left
                        ${form.type === t.value ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'}`}
                      style={form.type === t.value ? { background: t.color } : {}}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* ── Metal fields ── */}
          {isMetalType && (
            <>
              <div>
                <label className="label">Quantity (Tola)</label>
                <input type="number" placeholder="e.g. 5 or 2.5" min="0" step="0.001" className="input-field"
                  value={form.quantityTola} onChange={e => set('quantityTola', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">1 tola = 11.664 g · required for Auto rate mode</p>
              </div>
              <div>
                <label className="label">Valuation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => set('rateMode', 'auto')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${form.rateMode === 'auto' ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
                    <HiArrowPath className="w-4 h-4 flex-shrink-0" /> Auto Rate
                  </button>
                  <button type="button" onClick={() => set('rateMode', 'manual')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                      ${form.rateMode === 'manual' ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`}>
                    <HiPencil className="w-4 h-4 flex-shrink-0" /> Manual Entry
                  </button>
                </div>
              </div>
              {form.rateMode === 'auto' ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-amber-800">
                      {form.type === 'gold' ? '🥇 Fine Gold' : '🥈 Silver'} rate (fenegosida.org)
                    </span>
                    {currentRate
                      ? <span className="text-sm font-bold text-amber-800">{formatCurrency(currentRate)}/tola</span>
                      : <span className="text-xs text-amber-600 italic">Not fetched — click Refresh Rates</span>}
                  </div>
                  {estimatedMetalValue != null && (
                    <div className="flex justify-between items-center border-t border-amber-200 pt-2">
                      <span className="text-xs text-amber-700">{form.quantityTola} tola × {formatCurrency(currentRate)}</span>
                      <span className="text-sm font-bold text-amber-900">{formatCurrency(estimatedMetalValue)}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-amber-600">Value auto-updates every day at 11 AM NPT from fenegosida.org</p>
                </div>
              ) : (
                <div>
                  <label className="label">Current Value (NPR)</label>
                  <input type="number" placeholder="Enter value manually" min="0" className="input-field"
                    value={form.value} onChange={e => set('value', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Switch to Auto Rate to have fenegosida.org update it daily.</p>
                </div>
              )}
              <div>
                <label className="label">Commission / Broker Fee (%)</label>
                <input type="number" placeholder="e.g. 1.5" min="0" max="100" step="0.01" className="input-field"
                  value={form.commissionPct} onChange={e => set('commissionPct', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Leave blank if none. Used to show net receivable value.</p>
              </div>
            </>
          )}

          {/* ── Stock fields ── */}
          {isStockType && (
            <>
              <div>
                <label className="label">Number of Shares</label>
                <input type="number" placeholder="e.g. 100" min="1" step="1" className="input-field"
                  value={form.shares} onChange={e => set('shares', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Avg Buy Price / Share (NPR)</label>
                  <input type="number" placeholder="e.g. 850" min="0" className="input-field"
                    value={form.pricePerShare} onChange={e => set('pricePerShare', e.target.value)} />
                </div>
                <div>
                  <label className="label">Current Price / Share (NPR)</label>
                  <input type="number" placeholder="e.g. 1200" min="0" className="input-field"
                    value={form.currentPricePerShare} onChange={e => set('currentPricePerShare', e.target.value)} />
                </div>
              </div>
              {(estimatedStockValue != null || estimatedStockInvested != null) && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-1.5">
                  {estimatedStockInvested != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-700">Total Invested ({form.shares} × {formatCurrency(parseFloat(form.pricePerShare))})</span>
                      <span className="font-bold text-blue-900">{formatCurrency(estimatedStockInvested)}</span>
                    </div>
                  )}
                  {estimatedStockValue != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-700">Current Value ({form.shares} × {formatCurrency(parseFloat(form.currentPricePerShare))})</span>
                      <span className="font-bold text-blue-900">{formatCurrency(estimatedStockValue)}</span>
                    </div>
                  )}
                  {estimatedStockValue != null && estimatedStockInvested != null && (() => {
                    const pnl = estimatedStockValue - estimatedStockInvested
                    const pct = estimatedStockInvested > 0 ? (pnl / estimatedStockInvested * 100).toFixed(2) : '0.00'
                    return (
                      <div className={`flex justify-between text-xs border-t border-blue-200 pt-1.5 font-bold ${pnlColor(pnl)}`}>
                        <span>P&amp;L</span>
                        <span>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnl >= 0 ? '+' : ''}{pct}%)</span>
                      </div>
                    )
                  })()}
                </div>
              )}
              <div>
                <label className="label">Broker Commission (%)</label>
                <input type="number" placeholder="e.g. 1.5" min="0" max="100" step="0.01" className="input-field"
                  value={form.commissionPct} onChange={e => set('commissionPct', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Leave blank if none.</p>
              </div>
            </>
          )}

          {/* ── Other asset fields ── */}
          {!isMetalType && !isStockType && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Purchase Price (NPR)</label>
                  <input type="number" placeholder="What you paid" min="0" className="input-field"
                    value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
                </div>
                <div>
                  <label className="label">Current Value (NPR)</label>
                  <input type="number" placeholder="Market value today" min="0" className="input-field"
                    value={form.value} onChange={e => set('value', e.target.value)} />
                </div>
              </div>
              {form.purchasePrice && form.value && parseFloat(form.purchasePrice) > 0 && parseFloat(form.value) > 0 && (() => {
                const pnl = parseFloat(form.value) - parseFloat(form.purchasePrice)
                const pct = (pnl / parseFloat(form.purchasePrice)) * 100
                return (
                  <div className={`rounded-xl p-3 ${pnlBg(pnl)}`}>
                    <div className={`flex justify-between text-sm font-medium ${pnlColor(pnl)}`}>
                      <span>Value Change</span>
                      <span>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnl >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

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

      {/* ── Delete Modal ───────────────────────────────────────── */}
      <Modal isOpen={modal === 'delete'} onClose={() => setModal(null)} title="Delete Asset" size="sm">
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
