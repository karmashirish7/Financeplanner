import { HiArrowTrendingUp, HiArrowTrendingDown, HiMinus } from 'react-icons/hi2'

export default function StatCard({ title, value, sub, icon: Icon, iconBg = 'bg-indigo-50', iconColor = 'text-indigo-600', trend, trendLabel }) {
  const TrendIcon = trend > 0 ? HiArrowTrendingUp : trend < 0 ? HiArrowTrendingDown : HiMinus
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>

      {trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  )
}
