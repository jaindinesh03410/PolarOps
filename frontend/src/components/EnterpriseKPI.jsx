import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EnterpriseKPI({ title, value, subtitle, trend, trendValue, trendState, icon, alert }) {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  
  const trendColor = trendState === 'positive' ? 'text-emerald-600' : 
                     trendState === 'negative' ? 'text-rose-600' : 
                     'text-slate-500';
  
  const TrendIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={`bg-white p-5 rounded-lg border ${
        alert ? 'border-rose-500 shadow-md' : 'border-slate-200 shadow-sm'
      } flex items-start gap-4 relative overflow-hidden h-32`}
    >
      {alert && <div className="absolute top-0 left-0 w-1 h-full bg-rose-600" />}
      
      <div className={`p-2 border rounded-md ${
        alert ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
          {title}
        </h3>
        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-[12px] text-slate-400 font-medium">{subtitle}</p>
        )}
        {trendValue && (
          <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
            <TrendIcon size={14} strokeWidth={2.5} />
            <span className="text-[12px] font-semibold">{trendValue}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
