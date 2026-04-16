import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import {
  HiWallet, HiArrowTrendingUp, HiArrowTrendingDown,
  HiBanknotes, HiPlus, HiArrowRight, HiSparkles,
} from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import StatCard from '../components/ui/StatCard'
import { formatCurrency, formatCurrencyShort, formatPercent, formatDate } from '../utils/formatters'

const CHART_COLORS = ['#ef4444','#f97316','#eab308','#84cc16','#06b6d4','#8b5cf6','#ec4899','#6b7280']

function CustomTooltip({ active, payload, label }) {
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

export default function Dashboard() {
  const { transactions, categories, accounts, assets, goals, computed, loadDemoData } = useApp()

  // Empty state — new account with no data yet
  const isEmpty = accounts.length === 0 && transactions.length === 0 && assets.length === 0 && goals.length === 0
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <HiSparkles className="w-10 h-10 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Finance Planner!</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Your dashboard is empty. Start by adding your accounts and transactions,
            or load sample data to explore all features.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={loadDemoData}
            className="btn-primary flex items-center gap-2 px-6 py-2.5"
          >
            <HiSparkles className="w-4 h-4" /> Load Sample Data
          </button>
          <Link to="/accounts" className="btn-secondary flex items-center gap-2 px-6 py-2.5">
            <HiPlus className="w-4 h-4" /> Add My First Account
          </Link>
        </div>
        <p className="text-xs text-gray-400">Sample data uses realistic NPR amounts and can be cleared anytime from Settings.</p>
      </div>
    )
  }

  const {
    totalBalance, monthlyIncome, monthlyExpenses, savingsRate,
    netWorth, totalAssets, last6Months, categoryExpenses,
    netWorthHistory, healthScore,
  } = computed

  // Pie chart data from category expenses
  const pieData = Object.entries(categoryExpenses)
    .map(([id, value]) => ({
      name: categories.find(c => c.id === id)?.name || id,
      value,
      color: categories.find(c => c.id === id)?.color || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Recent 6 transactions
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)

  const healthColor = healthScore >= 70 ? 'text-emerald-600' : healthScore >= 40 ? 'text-amber-500' : 'text-red-500'
  const healthBg    = healthScore >= 70 ? 'bg-emerald-50' : healthScore >= 40 ? 'bg-amber-50' : 'bg-red-50'
  const healthLabel = healthScore >= 70 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Attention'

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          sub="Across all accounts"
          icon={HiWallet}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          trend={1}
          trendLabel="All accounts combined"
        />
        <StatCard
          title="Monthly Income"
          value={formatCurrency(monthlyIncome)}
          sub="This month"
          icon={HiArrowTrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={1}
          trendLabel="Current month"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          sub="This month"
          icon={HiArrowTrendingDown}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          trend={-1}
          trendLabel="Current month"
        />
        <StatCard
          title="Savings Rate"
          value={formatPercent(savingsRate)}
          sub={`Net worth: ${formatCurrencyShort(netWorth)}`}
          icon={HiBanknotes}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          trend={savingsRate >= 20 ? 1 : 0}
          trendLabel={savingsRate >= 20 ? 'On track' : 'Below target (20%)'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Income vs Expense Bar Chart */}
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Income vs Expenses</h3>
              <p className="text-xs text-gray-500">Last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last6Months} barSize={20} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income"   name="Income"   fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Expense Breakdown</h3>
            <p className="text-xs text-gray-500">This month by category</p>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 truncate max-w-[100px]">{d.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No expenses this month</div>
          )}
        </div>
      </div>

      {/* Net Worth Trend */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Net Worth Trend</h3>
            <p className="text-xs text-gray-500">Last 12 months · Includes assets</p>
          </div>
          <span className="text-sm font-bold text-indigo-600">{formatCurrency(netWorth)}</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={netWorthHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/100000).toFixed(1)}L`} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: Recent Transactions + Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <HiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recent.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
            )}
            {recent.map(t => {
              const cat = categories.find(c => c.id === t.categoryId)
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: cat?.color ? `${cat.color}18` : '#f3f4f6' }}>
                    {cat?.icon || '💳'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cat?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate">{t.notes || formatDate(t.date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 pb-4 pt-2">
            <Link to="/transactions">
              <button className="btn-primary w-full flex items-center justify-center gap-2">
                <HiPlus className="w-4 h-4" /> Add Transaction
              </button>
            </Link>
          </div>
        </div>

        {/* Financial Health Score */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-900">Financial Health</h3>

          {/* Score Circle */}
          <div className="flex flex-col items-center py-4">
            <div className={`w-24 h-24 rounded-full ${healthBg} flex flex-col items-center justify-center`}>
              <span className={`text-3xl font-bold ${healthColor}`}>{healthScore}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
            <span className={`mt-3 text-sm font-semibold ${healthColor}`}>{healthLabel}</span>
          </div>

          {/* Score breakdown */}
          <div className="space-y-3 text-xs">
            <ScoreLine label="Savings Rate" value={savingsRate} max={30} color="bg-emerald-500" />
            <ScoreLine label="Budget Control" value={Math.max(0, 100 - computed.budgetStatus.filter(b=>b.spent>b.amount).length * 20)} max={100} color="bg-indigo-500" />
            <ScoreLine label="Goal Progress" value={computed.goals?.length > 0 ? 70 : 30} max={100} color="bg-amber-500" />
          </div>

          <Link to="/ai-planner" className="btn-primary text-center text-xs py-2">
            Get AI Recommendations
          </Link>
        </div>
      </div>
    </div>
  )
}

function ScoreLine({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
