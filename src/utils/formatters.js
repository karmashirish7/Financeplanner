import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'

// Format currency in NPR with South Asian number grouping
export function formatCurrency(amount, currency = 'NPR') {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  const sign = amount < 0 ? '-' : ''
  return `${sign}${currency} ${formatted}`
}

// Short format: 1,00,000 → 1L / 50,000 → 50K
export function formatCurrencyShort(amount) {
  if (Math.abs(amount) >= 100000) return `NPR ${(amount / 100000).toFixed(1)}L`
  if (Math.abs(amount) >= 1000) return `NPR ${(amount / 1000).toFixed(1)}K`
  return formatCurrency(amount)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return dateStr
  }
}

export function formatMonthYear(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatPercent(value) {
  if (isNaN(value) || !isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function monthRange(date = new Date()) {
  return {
    start: startOfMonth(date).toISOString(),
    end: endOfMonth(date).toISOString(),
  }
}

// Return array of last N months as { label, start, end }
export function lastNMonths(n = 6) {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    months.push({
      label: format(d, 'MMM'),
      fullLabel: format(d, 'MMM yyyy'),
      start: startOfMonth(d).toISOString(),
      end: endOfMonth(d).toISOString(),
    })
  }
  return months
}

export function currentMonth() {
  return {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  }
}

export function isInMonth(dateStr, month, year) {
  try {
    const d = parseISO(dateStr)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  } catch {
    return false
  }
}
