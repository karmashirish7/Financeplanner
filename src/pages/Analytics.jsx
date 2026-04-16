import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatCurrencyShort, formatPercent, lastNMonths, isInMonth } from '../utils/formatters'
import { HiArrowTrendingUp, HiArrowTrendingDown, HiFire, HiSparkles, HiCube } from 'react-icons/hi2'
import { ASSET_TYPES, assetMeta } from './Assets'

const CHART_COLORS = ['#ef4444','#f97316','#eab308','#10b981','#06b6d4','#8b5cf6','#ec4899','#6b7280']

function Tooltip2({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrencyShort(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { transactions, categories, assets, computed } = useApp()
  const { monthlyIncome, monthlyExpenses, savingsRate, burnRate, projectedExpense, healthScore, totalBalance, totalAssets } = computed

  const months6 = lastNMonths(6)
  const months12 = lastNMonths(12)

  // Savings per month (last 6)
  const savingsData = months6.map(m => {
    const txns = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() + 1 === new Date(m.start).getMonth() + 1 &&
             d.getFullYear() === new Date(m.start).getFullYear()
    })
    const inc = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { label: m.label, savings: Math.max(0, inc - exp), income: inc, expenses: exp }
  })

  // Top expense categories (all time)
  const catTotals = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount
  })
  const topCategories = Object.entries(catTotals)
    .map(([id, total]) => ({
      name: categories.find(c => c.id === id)?.name || id,
      icon: categories.find(c => c.id === id)?.icon || '📦',
      color: categories.find(c => c.id === id)?.color || '#6b7280',
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Monthly expense trend (last 12)
  const expenseTrend = months12.map(m => {
    const d = new Date(m.start)
    const mm = d.getMonth() + 1, yy = d.getFullYear()
    const exp = transactions
      .filter(t => t.type === 'expense' && isInMonth(t.date, mm, yy))
      .reduce((s, t) => s + t.amount, 0)
    return { label: m.label, expenses: exp }
  })

  // Asset portfolio breakdown by type
  const assetByType = ASSET_TYPES.map(t => ({
    ...t,
    total: assets.filter(a => a.type === t.value).reduce((s, a) => s + a.value, 0),
  })).filter(t => t.total > 0)

  // Net worth composition for stacked bar
  const netWorthComposition = [
    { name: 'Cash & Bank', value: totalBalance, fill: '#6366f1' },
    { name: 'Assets',      value: totalAssets,  fill: '#10b981' },
  ]

  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
  const projectedSavings = monthlyIncome - projectedExpense

  const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'
  const healthLabel = healthScore >= 70 ? 'Healthy' : healthScore >= 40 ? 'Fair' : 'Needs Work'

  // Average monthly expense
  const avgMonthlyExpense = expenseTrend.filter(m => m.expenses > 0).reduce((s, m, _, a) => s + m.expenses / a.length, 0)

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiArrowTrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-gray-500 font-medium">Savings Rate</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatPercent(savingsRate)}</p>
          <p className="text-xs text-gray-400 mt-1">{savingsRate >= 20 ? '✓ Above 20% target' : 'Below 20% target'}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiFire className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-gray-500 font-medium">Daily Burn Rate</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrencyShort(burnRate)}</p>
          <p className="text-xs text-gray-400 mt-1">per day this month</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiArrowTrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Projected Expense</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrencyShort(projectedExpense)}</p>
          <p className="text-xs text-gray-400 mt-1">{daysLeft} days left in month</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiSparkles className="w-4 h-4 text-indigo-500" />
            <p className="text-xs text-gray-500 font-medium">Health Score</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: healthColor }}>{healthScore}<span className="text-sm text-gray-400">/100</span></p>
          <p className="text-xs mt-1 font-medium" style={{ color: healthColor }}>{healthLabel}</p>
        </div>
      </div>

      {/* Savings growth + Expense trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Savings Growth</h3>
          <p className="text-xs text-gray-500 mb-4">Monthly savings (last 6 months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={savingsData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<Tooltip2 />} />
              <Bar dataKey="savings" name="Savings" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Expense Trend</h3>
          <p className="text-xs text-gray-500 mb-4">Monthly expenses (last 12 months)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={expenseTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<Tooltip2 />} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top categories */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Top Expense Categories</h3>
          <p className="text-xs text-gray-500 mb-4">All-time spending by category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCategories} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {topCategories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Spending Share</h3>
          <p className="text-xs text-gray-500 mb-2">All-time category breakdown</p>
          {topCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topCategories} dataKey="total" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {topCategories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {topCategories.slice(0, 4).map((c, i) => {
                  const grand = topCategories.reduce((s, x) => s + x.total, 0)
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                        <span className="text-gray-600">{c.name}</span>
                      </div>
                      <span className="font-medium text-gray-700">{Math.round((c.total / grand) * 100)}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Asset Portfolio */}
      {assets.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiCube className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900">Asset Portfolio</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie chart */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-500 mb-2 self-start">Portfolio Breakdown</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={assetByType} dataKey="total" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {assetByType.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip formatter={v => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 w-full mt-1">
                {assetByType.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                      <span className="text-gray-600">{t.icon} {t.label}</span>
                    </div>
                    <span className="font-semibold text-gray-700">{formatCurrency(t.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Net worth composition bar */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Net Worth Composition</p>
              <div className="space-y-3">
                {netWorthComposition.map((item, i) => {
                  const total = totalBalance + totalAssets
                  const pct   = total > 0 ? (item.value / total) * 100 : 0
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                          <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-gray-700">{formatCurrency(item.value)} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: item.fill }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Total Net Worth</span>
                    <span className="font-bold text-gray-900">{formatCurrency(totalBalance + totalAssets)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual assets list */}
            <div>
              <p className="text-xs text-gray-500 mb-2">All Assets ({assets.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {[...assets].sort((a, b) => b.value - a.value).map(asset => {
                  const meta = assetMeta(asset.type)
                  const pct  = totalAssets > 0 ? (asset.value / totalAssets) * 100 : 0
                  return (
                    <div key={asset.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm flex-shrink-0">{meta.icon}</span>
                        <span className="text-gray-700 truncate font-medium">{asset.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-400">{pct.toFixed(1)}%</span>
                        <span className="font-semibold text-gray-800">{formatCurrencyShort(asset.value)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights panel */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Smart Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            icon="💰"
            title="Monthly Surplus"
            value={formatCurrency(Math.max(0, monthlyIncome - monthlyExpenses))}
            sub={monthlyIncome > monthlyExpenses ? 'Great job staying in surplus' : 'Spending exceeds income this month'}
            good={monthlyIncome >= monthlyExpenses}
          />
          <InsightCard
            icon="📈"
            title="Avg Monthly Expenses"
            value={formatCurrency(Math.round(avgMonthlyExpense))}
            sub={`vs ${formatCurrency(monthlyExpenses)} this month`}
            good={monthlyExpenses <= avgMonthlyExpense}
          />
          <InsightCard
            icon="🎯"
            title="Projected Month Savings"
            value={formatCurrency(Math.max(0, projectedSavings))}
            sub={projectedSavings >= 0 ? 'Based on current burn rate' : 'On track to overspend'}
            good={projectedSavings >= 0}
          />
        </div>
      </div>
    </div>
  )
}

function InsightCard({ icon, title, value, sub, good }) {
  return (
    <div className={`rounded-xl p-4 ${good ? 'bg-emerald-50' : 'bg-amber-50'}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-gray-500 mt-2 font-medium">{title}</p>
      <p className={`text-lg font-bold mt-0.5 ${good ? 'text-emerald-700' : 'text-amber-700'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}
