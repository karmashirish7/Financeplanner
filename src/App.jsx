import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Accounts from './pages/Accounts'
import Goals from './pages/Goals'
import Budget from './pages/Budget'
import Analytics from './pages/Analytics'
import AIPlanner from './pages/AIPlanner'
import Assets from './pages/Assets'
import Liabilities from './pages/Liabilities'
import Categories from './pages/Categories'

// Full-screen spinner shown while Supabase resolves the session
function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, authLoading } = useApp()
  if (authLoading) return <AuthLoader />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, authLoading } = useApp()
  if (authLoading) return <AuthLoader />
  return user ? <Navigate to="/" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route
        path="/"
        element={<ProtectedRoute><Layout /></ProtectedRoute>}
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="accounts"     element={<Accounts />} />
        <Route path="assets"       element={<Assets />} />
        <Route path="liabilities"  element={<Liabilities />} />
        <Route path="goals"        element={<Goals />} />
        <Route path="budget"       element={<Budget />} />
        <Route path="analytics"    element={<Analytics />} />
        <Route path="categories"   element={<Categories />} />
        <Route path="ai-planner"   element={<AIPlanner />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
