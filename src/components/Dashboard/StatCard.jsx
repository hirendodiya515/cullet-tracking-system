export default function StatCard({ title, value, unit, icon, trend, trendLabel }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800">{value}</span>
            {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
          </div>
        </div>
        <div className="p-3 bg-indigo-50 rounded-xl">
          {icon}
        </div>
      </div>
      
      {typeof trend === 'number' && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="ml-2 text-slate-500">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
