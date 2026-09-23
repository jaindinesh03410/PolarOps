import { motion } from 'framer-motion';
import { Clock, User, MapPin, Package, AlertTriangle, CheckCircle } from 'lucide-react';

const activityIcons = {
  login: User,
  location: MapPin,
  inventory: Package,
  alert: AlertTriangle,
  completed: CheckCircle,
};

const activityColors = {
  login: 'text-blue-400 bg-blue-500/10',
  location: 'text-green-400 bg-green-500/10',
  inventory: 'text-purple-400 bg-purple-500/10',
  alert: 'text-rose-400 bg-rose-500/10',
  completed: 'text-emerald-400 bg-emerald-500/10',
};

export default function ActivityTimeline({ activities = [] }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-polar-blue-light" />
        Recent Activity
      </h3>
      
      <div className="space-y-4 relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-4 bottom-4 w-px bg-white/10" />
        
        {activities.slice(0, 10).map((activity, idx) => {
          const Icon = activityIcons[activity.type] || Clock;
          const colors = activityColors[activity.type] || 'text-slate-400 bg-slate-500/10';
          
          return (
            <motion.div
              key={activity.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-4 relative"
            >
              <div className={`w-10 h-10 rounded-xl ${colors} flex items-center justify-center z-10 shadow-lg`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 pt-1">
                <div className="text-sm font-medium text-ice-white">{activity.description}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {activity.user && <span>{activity.user} • </span>}
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
                {activity.metadata && (
                  <div className="mt-2 text-xs font-mono text-slate-500 bg-black/20 px-2 py-1 rounded">
                    {JSON.stringify(activity.metadata)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        
        {activities.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}
