import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  HiHome, HiArrowsRightLeft, HiBuildingLibrary,
  HiFlag, HiCalculator, HiChartBar, HiSparkles,
  HiArrowRightOnRectangle, HiXMark, HiCube,
} from 'react-icons/hi2'
import { useState } from 'react'

const NAV = [
  { to: '/',            label: 'Dashboard',    icon: HiHome },
  { to: '/transactions',label: 'Transactions', icon: HiArrowsRightLeft },
  { to: '/accounts',    label: 'Accounts',     icon: HiBuildingLibrary },
  { to: '/assets',      label: 'Assets',       icon: HiCube },
  { to: '/goals',       label: 'Goals',        icon: HiFlag },
  { to: '/budget',      label: 'Budget',       icon: HiCalculator },
  { to: '/analytics',   label: 'Analytics',    icon: HiChartBar },
  { to: '/ai-planner',  label: 'AI Planner',   icon: HiSparkles },
]

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Supabase stores the display name in user_metadata
  const displayName  = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''

  const content = (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            FP
          </div>
          <span className="font-semibold text-base tracking-tight">Finance Planner</span>
        </div>
        {/* Mobile close button */}
        <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1">
          <HiXMark className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
            {label === 'AI Planner' && (
              <span className="ml-auto text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-semibold">AI</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {displayName[0]?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <HiArrowRightOnRectangle className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-shrink-0">{content}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative z-10 flex">{content}</aside>
        </div>
      )}
    </>
  )
}
