import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import { useApp } from '../../context/AppContext'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { dataLoading } = useApp()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6 relative">
          {dataLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Syncing data…</p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <BottomNav onMoreClick={() => setMobileOpen(true)} />
    </div>
  )
}
