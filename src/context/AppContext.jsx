import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { subMonths } from 'date-fns'
import { supabase, db } from '../services/supabase'
import { isInMonth } from '../utils/formatters'

// ─── Demo data builder (uses real category/account IDs from DB) ───────────────
async function insertDemoData(userId) {
  // 1. Fetch seeded categories
  const { data: cats } = await supabase.from('categories').select('*').eq('user_id', userId)
  const catId = (name) => cats?.find(c => c.name === name)?.id

  // 2. Insert demo accounts
  const { data: accs } = await supabase.from('accounts').insert([
    { user_id: userId, name: 'Cash',       type: 'cash',   balance: 15000,  color: '#10b981' },
    { user_id: userId, name: 'Nabil Bank', type: 'bank',   balance: 245000, color: '#6366f1' },
    { user_id: userId, name: 'Global IME', type: 'bank',   balance: 82000,  color: '#3b82f6' },
    { user_id: userId, name: 'eSewa',      type: 'wallet', balance: 8500,   color: '#f59e0b' },
  ]).select()
  if (!accs) return

  const accId = (name) => accs.find(a => a.name === name)?.id
  const now   = new Date()
  const d     = (monthsAgo, day) => {
    const dt = subMonths(now, monthsAgo)
    dt.setDate(day)
    return dt.toISOString().split('T')[0]
  }

  // 3. Build transactions referencing real IDs
  const txns = []
  for (let m = 5; m >= 0; m--) {
    txns.push({ user_id: userId, type: 'income',  amount: 85000, account_id: accId('Nabil Bank'), category_id: catId('Salary'),        date: d(m, 25), notes: 'Monthly salary',   is_recurring: true })
  }
  txns.push({ user_id: userId, type: 'income',  amount: 22000, account_id: accId('Nabil Bank'), category_id: catId('Freelance'),      date: d(0, 10), notes: 'Web design project', is_recurring: false })
  txns.push({ user_id: userId, type: 'income',  amount: 15000, account_id: accId('Nabil Bank'), category_id: catId('Freelance'),      date: d(1, 15), notes: 'Logo design',        is_recurring: false })
  txns.push({ user_id: userId, type: 'income',  amount: 8000,  account_id: accId('Nabil Bank'), category_id: catId('Interest'),       date: d(0,  5), notes: 'FD interest',        is_recurring: false })

  // Current month expenses
  txns.push({ user_id: userId, type: 'expense', amount: 18000, account_id: accId('Nabil Bank'), category_id: catId('Rent'),           date: d(0,  1), notes: 'Monthly rent',      is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 8500,  account_id: accId('Cash'),       category_id: catId('Food & Dining'),  date: d(0,  3), notes: 'Groceries',         is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 3200,  account_id: accId('Cash'),       category_id: catId('Transport'),      date: d(0,  6), notes: 'Fuel & taxi',       is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 1500,  account_id: accId('eSewa'),      category_id: catId('Utilities'),      date: d(0,  7), notes: 'Electricity bill',  is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 2200,  account_id: accId('eSewa'),      category_id: catId('Utilities'),      date: d(0,  8), notes: 'Internet & phone',  is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 4500,  account_id: accId('Nabil Bank'), category_id: catId('Shopping'),       date: d(0,  9), notes: 'Clothing',          is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 1800,  account_id: accId('Cash'),       category_id: catId('Entertainment'),  date: d(0, 12), notes: 'Netflix & cinema',  is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 3000,  account_id: accId('Nabil Bank'), category_id: catId('Health'),         date: d(0, 14), notes: 'Medical checkup',   is_recurring: false })

  // Last month
  txns.push({ user_id: userId, type: 'expense', amount: 18000, account_id: accId('Nabil Bank'), category_id: catId('Rent'),           date: d(1,  1), notes: 'Monthly rent',      is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 9200,  account_id: accId('Cash'),       category_id: catId('Food & Dining'),  date: d(1,  5), notes: 'Groceries',         is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 2800,  account_id: accId('Cash'),       category_id: catId('Transport'),      date: d(1,  8), notes: 'Fuel',              is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 1500,  account_id: accId('eSewa'),      category_id: catId('Utilities'),      date: d(1,  7), notes: 'Electricity bill',  is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 5500,  account_id: accId('Nabil Bank'), category_id: catId('Education'),      date: d(1, 10), notes: 'Online course',     is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 6000,  account_id: accId('Nabil Bank'), category_id: catId('Shopping'),       date: d(1, 18), notes: 'Electronics',       is_recurring: false })

  // 2 months ago
  txns.push({ user_id: userId, type: 'expense', amount: 18000, account_id: accId('Nabil Bank'), category_id: catId('Rent'),           date: d(2,  1), notes: 'Monthly rent',      is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 7800,  account_id: accId('Cash'),       category_id: catId('Food & Dining'),  date: d(2,  4), notes: 'Groceries',         is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 4200,  account_id: accId('Cash'),       category_id: catId('Transport'),      date: d(2,  9), notes: 'Travel',            is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 3500,  account_id: accId('eSewa'),      category_id: catId('Health'),         date: d(2, 15), notes: 'Pharmacy',          is_recurring: false })

  // 3 months ago
  txns.push({ user_id: userId, type: 'expense', amount: 18000, account_id: accId('Nabil Bank'), category_id: catId('Rent'),           date: d(3,  1), notes: 'Monthly rent',      is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 8900,  account_id: accId('Cash'),       category_id: catId('Food & Dining'),  date: d(3,  6), notes: 'Groceries',         is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 12000, account_id: accId('Nabil Bank'), category_id: catId('Entertainment'),  date: d(3, 20), notes: 'Dashain celebrations', is_recurring: false })

  // 4 months ago
  txns.push({ user_id: userId, type: 'expense', amount: 18000, account_id: accId('Nabil Bank'), category_id: catId('Rent'),           date: d(4,  1), notes: 'Monthly rent',      is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 7600,  account_id: accId('Cash'),       category_id: catId('Food & Dining'),  date: d(4,  5), notes: 'Groceries',         is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 8000,  account_id: accId('Nabil Bank'), category_id: catId('Education'),      date: d(4, 20), notes: 'Coding bootcamp',   is_recurring: false })

  // 5 months ago
  txns.push({ user_id: userId, type: 'expense', amount: 18000, account_id: accId('Nabil Bank'), category_id: catId('Rent'),           date: d(5,  1), notes: 'Monthly rent',      is_recurring: true })
  txns.push({ user_id: userId, type: 'expense', amount: 8200,  account_id: accId('Cash'),       category_id: catId('Food & Dining'),  date: d(5,  4), notes: 'Groceries',         is_recurring: false })
  txns.push({ user_id: userId, type: 'expense', amount: 5000,  account_id: accId('eSewa'),      category_id: catId('Shopping'),       date: d(5, 22), notes: 'Clothing',          is_recurring: false })

  // Filter out any rows with null category/account (safety)
  const validTxns = txns.filter(t => t.category_id && t.account_id)
  await supabase.from('transactions').insert(validTxns)

  // 4. Demo assets
  await supabase.from('assets').insert([
    { user_id: userId, name: 'Gold (50g)',     type: 'gold',       value: 350000 },
    { user_id: userId, name: 'Fixed Deposit',  type: 'savings',    value: 500000 },
    { user_id: userId, name: 'Mutual Funds',   type: 'investment', value: 120000 },
    { user_id: userId, name: 'Laptop',         type: 'other',      value: 65000  },
  ])

  // 5. Demo goals
  const now2 = new Date()
  await supabase.from('goals').insert([
    { user_id: userId, name: 'Emergency Fund',  target_amount: 300000,  current_amount: 150000, deadline: new Date(now2.getFullYear(), now2.getMonth() + 10, 1).toISOString(), monthly_contribution: 15000, color: '#10b981' },
    { user_id: userId, name: 'New Laptop',       target_amount: 80000,   current_amount: 30000,  deadline: new Date(now2.getFullYear(), now2.getMonth() + 4,  1).toISOString(), monthly_contribution: 12500, color: '#6366f1' },
    { user_id: userId, name: 'Family Vacation',  target_amount: 200000,  current_amount: 50000,  deadline: new Date(now2.getFullYear() + 1, 5, 1).toISOString(),                monthly_contribution: 12500, color: '#f59e0b' },
    { user_id: userId, name: 'Own Apartment',    target_amount: 5000000, current_amount: 420000, deadline: new Date(now2.getFullYear() + 8, 0, 1).toISOString(),                monthly_contribution: 50000, color: '#ec4899' },
  ])

  // 6. Demo budgets (current month)
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  await supabase.from('budgets').insert([
    { user_id: userId, category_id: catId('Food & Dining'),  amount: 10000, month, year },
    { user_id: userId, category_id: catId('Rent'),           amount: 18000, month, year },
    { user_id: userId, category_id: catId('Transport'),      amount: 4000,  month, year },
    { user_id: userId, category_id: catId('Utilities'),      amount: 3500,  month, year },
    { user_id: userId, category_id: catId('Entertainment'),  amount: 2000,  month, year },
    { user_id: userId, category_id: catId('Shopping'),       amount: 5000,  month, year },
    { user_id: userId, category_id: catId('Health'),         amount: 3000,  month, year },
  ].filter(b => b.category_id))
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

const EMPTY = {
  accounts:     [],
  transactions: [],
  categories:   [],
  assets:       [],
  goals:        [],
  budgets:      [],
}

export function AppProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [data,        setData]        = useState(EMPTY)
  const [metalRates,  setMetalRates]  = useState({ gold: null, silver: null })

  // ── Fetch all user data ──────────────────────────────────────────────────
  const fetchAll = useCallback(async (uid) => {
    setDataLoading(true)
    const [cats, accs, txns, assets, goals, budgets, rates] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', uid).order('name'),
      supabase.from('accounts').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('assets').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('goals').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('budgets').select('*').eq('user_id', uid),
      supabase.from('precious_metal_rates').select('*').order('date', { ascending: false }).limit(4),
    ])

    // Build { gold: latestRate, silver: latestRate }
    const ratesObj = { gold: null, silver: null }
    if (rates.data) {
      rates.data.forEach(r => {
        if ((r.metal === 'gold' || r.metal === 'silver') && !ratesObj[r.metal]) {
          ratesObj[r.metal] = db.toMetalRate(r)
        }
      })
    }
    setMetalRates(ratesObj)

    setData({
      categories:   (cats.data    || []).map(db.toCategory),
      accounts:     (accs.data    || []).map(db.toAccount),
      transactions: (txns.data    || []).map(db.toTransaction),
      assets:       (assets.data  || []).map(db.toAsset),
      goals:        (goals.data   || []).map(db.toGoal),
      budgets:      (budgets.data || []).map(db.toBudget),
    })
    setDataLoading(false)
  }, [])

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchAll(u.id).finally(() => setAuthLoading(false))
      else setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        if (event === 'SIGNED_IN') fetchAll(u.id)
      } else {
        setData(EMPTY)
      }
    })
    return () => subscription.unsubscribe()
  }, [fetchAll])

  // ── Computed values (same logic as before) ───────────────────────────────
  const computed = useMemo(() => {
    const { accounts, transactions, assets, goals, budgets, categories } = data
    const now = new Date()
    const cm  = now.getMonth() + 1
    const cy  = now.getFullYear()

    const currentMonthTxns = transactions.filter(t => isInMonth(t.date, cm, cy))
    const monthlyIncome    = currentMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const monthlyExpenses  = currentMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savingsRate      = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0
    const totalBalance     = accounts.reduce((s, a) => s + a.balance, 0)
    const totalAssets      = assets.reduce((s, a) => s + a.value, 0)
    const netWorth         = totalBalance + totalAssets

    const categoryExpenses = {}
    currentMonthTxns.filter(t => t.type === 'expense').forEach(t => {
      categoryExpenses[t.categoryId] = (categoryExpenses[t.categoryId] || 0) + t.amount
    })

    const last6Months = []
    for (let i = 5; i >= 0; i--) {
      const d   = subMonths(now, i)
      const mm  = d.getMonth() + 1
      const yy  = d.getFullYear()
      const txs = transactions.filter(t => isInMonth(t.date, mm, yy))
      last6Months.push({
        label:    d.toLocaleString('default', { month: 'short' }),
        income:   txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      })
    }

    const netWorthHistory = []
    let runningNW = netWorth
    for (let i = 0; i < 12; i++) {
      const d   = subMonths(now, i)
      const mm  = d.getMonth() + 1
      const yy  = d.getFullYear()
      const txs = transactions.filter(t => isInMonth(t.date, mm, yy))
      const net = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                - txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      netWorthHistory.unshift({ label: d.toLocaleString('default', { month: 'short' }), value: Math.round(runningNW) })
      runningNW -= net
    }

    const budgetStatus = budgets
      .filter(b => b.month === cm && b.year === cy)
      .map(b => {
        const spent = currentMonthTxns
          .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
          .reduce((s, t) => s + t.amount, 0)
        return { ...b, spent, remaining: b.amount - spent, pct: Math.min((spent / b.amount) * 100, 100) }
      })

    const daysInMonth = new Date(cy, cm, 0).getDate()
    const dayOfMonth  = now.getDate()
    const burnRate    = dayOfMonth > 0 ? monthlyExpenses / dayOfMonth : 0
    const projectedExpense = burnRate * daysInMonth

    let healthScore = 50
    if (savingsRate >= 20) healthScore += 20
    else if (savingsRate >= 10) healthScore += 10
    if (monthlyExpenses < monthlyIncome * 0.7) healthScore += 15
    healthScore -= budgetStatus.filter(b => b.spent > b.amount).length * 5
    if (goals.length > 0) healthScore += 10
    if (totalAssets > totalBalance) healthScore += 5
    healthScore = Math.max(0, Math.min(100, healthScore))

    return {
      totalBalance, totalAssets, netWorth,
      monthlyIncome, monthlyExpenses, savingsRate,
      categoryExpenses, last6Months, netWorthHistory,
      budgetStatus, burnRate, projectedExpense, healthScore,
      currentMonthTxns,
    }
  }, [data])

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions = {
    // ── Auth ───────────────────────────────────────────────────────────────
    async login({ email, password }) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async register({ name, email, password }) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) throw error
    },
    async logout() {
      await supabase.auth.signOut()
      setUser(null)
      setData(EMPTY)
    },

    // ── Demo data ──────────────────────────────────────────────────────────
    async loadDemoData() {
      if (!user) return
      setDataLoading(true)
      await insertDemoData(user.id)
      await fetchAll(user.id)
    },
    async resetData() {
      if (!user) return
      setDataLoading(true)
      // Delete all user data (RLS ensures only their own rows)
      await Promise.all([
        supabase.from('budgets').delete().eq('user_id', user.id),
        supabase.from('goals').delete().eq('user_id', user.id),
        supabase.from('assets').delete().eq('user_id', user.id),
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('accounts').delete().eq('user_id', user.id),
      ])
      await fetchAll(user.id)
    },

    // ── Metal Rates ────────────────────────────────────────────
    async refreshMetalRates() {
      const { error } = await supabase.functions.invoke('scrape-metal-rates', { body: {} })
      if (error) throw new Error(error.message || 'Rate refresh failed')
      if (user) await fetchAll(user.id)
    },

    // ── Accounts ───────────────────────────────────────────────────────────
    async addAccount(d) {
      const { data: row, error } = await supabase.from('accounts').insert(db.fromAccount(d, user.id)).select().single()
      if (error) throw error
      setData(s => ({ ...s, accounts: [...s.accounts, db.toAccount(row)] }))
    },
    async updateAccount(d) {
      const { error } = await supabase.from('accounts').update(db.fromAccount(d, user.id)).eq('id', d.id)
      if (error) throw error
      setData(s => ({ ...s, accounts: s.accounts.map(a => a.id === d.id ? d : a) }))
    },
    async deleteAccount(id) {
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
      setData(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) }))
    },

    // ── Transactions ───────────────────────────────────────────────────────
    async addTransaction(d) {
      const { data: row, error } = await supabase.from('transactions').insert(db.fromTransaction(d, user.id)).select().single()
      if (error) throw error
      setData(s => ({ ...s, transactions: [db.toTransaction(row), ...s.transactions] }))
    },
    async updateTransaction(d) {
      const { error } = await supabase.from('transactions').update(db.fromTransaction(d, user.id)).eq('id', d.id)
      if (error) throw error
      setData(s => ({ ...s, transactions: s.transactions.map(t => t.id === d.id ? d : t) }))
    },
    async deleteTransaction(id) {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      setData(s => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) }))
    },

    // ── Categories ─────────────────────────────────────────────────────────
    async addCategory(d) {
      const { data: row, error } = await supabase.from('categories').insert(db.fromCategory(d, user.id)).select().single()
      if (error) throw error
      setData(s => ({ ...s, categories: [...s.categories, db.toCategory(row)] }))
    },
    async deleteCategory(id) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
      setData(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) }))
    },

    // ── Assets ─────────────────────────────────────────────────────────────
    async addAsset(d) {
      const { data: row, error } = await supabase.from('assets').insert(db.fromAsset(d, user.id)).select().single()
      if (error) throw error
      setData(s => ({ ...s, assets: [...s.assets, db.toAsset(row)] }))
    },
    async updateAsset(d) {
      const { error } = await supabase.from('assets').update(db.fromAsset(d, user.id)).eq('id', d.id)
      if (error) throw error
      setData(s => ({ ...s, assets: s.assets.map(a => a.id === d.id ? { ...d, updatedAt: new Date().toISOString() } : a) }))
    },
    async deleteAsset(id) {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
      setData(s => ({ ...s, assets: s.assets.filter(a => a.id !== id) }))
    },

    // ── Goals ──────────────────────────────────────────────────────────────
    async addGoal(d) {
      const { data: row, error } = await supabase.from('goals').insert(db.fromGoal(d, user.id)).select().single()
      if (error) throw error
      setData(s => ({ ...s, goals: [...s.goals, db.toGoal(row)] }))
    },
    async updateGoal(d) {
      const { error } = await supabase.from('goals').update(db.fromGoal(d, user.id)).eq('id', d.id)
      if (error) throw error
      setData(s => ({ ...s, goals: s.goals.map(g => g.id === d.id ? d : g) }))
    },
    async deleteGoal(id) {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
      setData(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) }))
    },

    // ── Budgets ────────────────────────────────────────────────────────────
    async setBudget(d) {
      const row = db.fromBudget(d, user.id)
      const { data: upserted, error } = await supabase
        .from('budgets')
        .upsert(row, { onConflict: 'user_id,category_id,month,year' })
        .select()
        .single()
      if (error) throw error
      const mapped = db.toBudget(upserted)
      setData(s => {
        const exists = s.budgets.findIndex(b => b.categoryId === d.categoryId && b.month === d.month && b.year === d.year)
        if (exists >= 0) {
          const updated = [...s.budgets]
          updated[exists] = mapped
          return { ...s, budgets: updated }
        }
        return { ...s, budgets: [...s.budgets, mapped] }
      })
    },
    async deleteBudget(id) {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
      setData(s => ({ ...s, budgets: s.budgets.filter(b => b.id !== id) }))
    },
  }

  const value = {
    // Auth state
    user,
    authLoading,
    dataLoading,
    // Data
    ...data,
    // Metal rates (shared, not per-user)
    metalRates,
    // Computed
    computed,
    // Actions
    ...actions,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
