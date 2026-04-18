import { NavLink } from 'react-router-dom'
import {
  HiHome, HiArrowsRightLeft, HiBuildingLibrary,
  HiCalculator, HiBars3, HiCalendarDays,
} from 'react-icons/hi2'

const ITEMS = [
  { to: '/',             label: 'Home',    icon: HiHome,            end: true  },
  { to: '/transactions', label: 'Txns',    icon: HiArrowsRightLeft, end: false },
  { to: '/emi',          label: 'EMI',     icon: HiCalendarDays,    end: false },
  { to: '/budget',       label: 'Budget',  icon: HiCalculator,      end: false },
]

export default function BottomNav({ onMoreClick }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40 flex items-stretch">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
             ${isActive ? 'text-indigo-600' : 'text-gray-400 active:text-gray-600'}`
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-gray-400 active:text-gray-600 transition-colors"
      >
        <HiBars3 className="w-5 h-5" />
        More
      </button>
    </nav>
  )
}
