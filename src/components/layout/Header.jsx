import { useLocation } from 'react-router-dom'
import { HiBars3, HiBell } from 'react-icons/hi2'
import { useApp } from '../../context/AppContext'
import { format } from 'date-fns'

const PAGE_TITLES = {
  '/':             { title: 'Dashboard',    sub: 'Your financial overview' },
  '/transactions': { title: 'Transactions', sub: 'Track income & expenses' },
  '/accounts':     { title: 'Accounts',     sub: 'Manage your accounts' },
  '/assets':       { title: 'Assets',       sub: 'Track your assets' },
  '/liabilities':  { title: 'Liabilities',  sub: 'Manage your debts' },
  '/goals':        { title: 'Goals',        sub: 'Track your financial targets' },
  '/budget':       { title: 'Budget',       sub: 'Monthly budget planner' },
  '/analytics':    { title: 'Analytics',    sub: 'Spending insights & trends' },
  '/ai-planner':   { title: 'AI Planner',   sub: 'Personalized financial advice' },
  '/categories':   { title: 'Categories',   sub: 'Manage transaction categories' },
}

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const { computed } = useApp()
  const page = PAGE_TITLES[pathname] || { title: 'Finance Planner', sub: '' }

  // Show budget alert if any category overspent
  const alerts = computed.budgetStatus.filter(b => b.spent > b.amount).length

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <HiBars3 className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">{page.title}</h1>
          <p className="text-xs text-gray-500 hidden sm:block">{page.sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:block text-xs text-gray-400">
          {format(new Date(), 'EEE, d MMM yyyy')}
        </span>

        {/* Budget alert bell */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <HiBell className="w-5 h-5" />
          {alerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>
    </header>
  )
}
