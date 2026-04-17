import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── DB Row ↔ Frontend Object Transforms ────────────────────────────────────
// Postgres uses snake_case; the app uses camelCase. These mappers bridge them.

export const db = {
  // ── Categories ────────────────────────────────────────────
  toCategory: (r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color,
    icon: r.icon,
  }),
  fromCategory: (d, userId) => ({
    user_id: userId,
    name: d.name,
    type: d.type,
    color: d.color,
    icon: d.icon,
  }),

  // ── Accounts ──────────────────────────────────────────────
  toAccount: (r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    balance: Number(r.balance),
    color: r.color,
  }),
  fromAccount: (d, userId) => ({
    user_id: userId,
    name: d.name,
    type: d.type,
    balance: d.balance,
    color: d.color,
  }),

  // ── Transactions ──────────────────────────────────────────
  toTransaction: (r) => ({
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    accountId: r.account_id,
    categoryId: r.category_id,
    date: r.date,
    notes: r.notes || '',
    isRecurring: r.is_recurring,
  }),
  fromTransaction: (d, userId) => ({
    user_id: userId,
    type: d.type,
    amount: d.amount,
    account_id: d.accountId,
    category_id: d.categoryId,
    date: d.date,
    notes: d.notes || null,
    is_recurring: d.isRecurring ?? false,
  }),

  // ── Assets ────────────────────────────────────────────────
  toAsset: (r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    value: Number(r.value),
    quantityTola: r.quantity_tola != null ? Number(r.quantity_tola) : null,
    rateMode: r.rate_mode || 'auto',
    commissionPct: r.commission_pct != null ? Number(r.commission_pct) : null,
    updatedAt: r.updated_at,
  }),
  fromAsset: (d, userId) => ({
    user_id: userId,
    name: d.name,
    type: d.type,
    value: d.value,
    quantity_tola: d.quantityTola ?? null,
    rate_mode: d.rateMode ?? 'auto',
    commission_pct: d.commissionPct ?? null,
    updated_at: new Date().toISOString(),
  }),

  // ── Precious Metal Rates ──────────────────────────────────
  toMetalRate: (r) => ({
    metal: r.metal,
    ratePerTola: Number(r.rate_per_tola),
    date: r.date,
    fetchedAt: r.fetched_at,
  }),

  // ── Goals ─────────────────────────────────────────────────
  toGoal: (r) => ({
    id: r.id,
    name: r.name,
    targetAmount: Number(r.target_amount),
    currentAmount: Number(r.current_amount),
    deadline: r.deadline,
    monthlyContribution: Number(r.monthly_contribution),
    color: r.color,
  }),
  fromGoal: (d, userId) => ({
    user_id: userId,
    name: d.name,
    target_amount: d.targetAmount,
    current_amount: d.currentAmount,
    deadline: d.deadline || null,
    monthly_contribution: d.monthlyContribution,
    color: d.color,
  }),

  // ── Liabilities ───────────────────────────────────────────
  toLiability: (r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    balance: Number(r.balance),
    interestRate: r.interest_rate != null ? Number(r.interest_rate) : null,
    minimumPayment: r.minimum_payment != null ? Number(r.minimum_payment) : null,
    dueDay: r.due_day ?? null,
    color: r.color,
    updatedAt: r.updated_at,
  }),
  fromLiability: (d, userId) => ({
    user_id: userId,
    name: d.name,
    type: d.type,
    balance: d.balance,
    interest_rate: d.interestRate ?? null,
    minimum_payment: d.minimumPayment ?? null,
    due_day: d.dueDay ?? null,
    color: d.color,
    updated_at: new Date().toISOString(),
  }),

  // ── Budgets ───────────────────────────────────────────────
  toBudget: (r) => ({
    id: r.id,
    categoryId: r.category_id,
    amount: Number(r.amount),
    month: r.month,
    year: r.year,
  }),
  fromBudget: (d, userId) => ({
    user_id: userId,
    category_id: d.categoryId,
    amount: d.amount,
    month: d.month,
    year: d.year,
  }),
}
