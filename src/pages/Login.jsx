import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function Login() {
  const { login, register } = useApp()
  const [mode,  setMode]  = useState('login')
  const [form,  setForm]  = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password) return setError('Please fill in all required fields.')
    if (mode === 'register' && !form.name) return setError('Please enter your name.')

    setBusy(true)
    try {
      if (mode === 'register') {
        await register({ name: form.name, email: form.email, password: form.password })
        setError('') // success — Supabase may send a confirmation email
        // After sign-up the onAuthStateChange listener in AppContext handles navigation
      } else {
        await login({ email: form.email, password: form.password })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-xl">FP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Finance Planner</h1>
          <p className="text-gray-400 text-sm mt-1">Take control of your financial life</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
            {[['login','Sign In'], ['register','Register']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  placeholder="Shirish Karmacharya"
                  className="input-field"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="input-field"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
              {mode === 'register' && (
                <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-2.5 text-base mt-2"
            >
              {busy
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                  </span>
                : mode === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-center text-xs text-gray-400 mt-4">
              By registering, your data is securely stored in Supabase and tied to your account.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
