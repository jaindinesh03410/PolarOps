import { useState, useEffect } from 'react';
import { Droplets, Calendar, TrendingUp, Pen, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function ResourceTracker({ baseId = "station-1" }) {
  const [resources, setResources] = useState(null);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({ volume: '', maxVolume: '' });

  useEffect(() => {
    loadResourceData();
  }, [baseId]);

  const loadResourceData = async () => {
    // Unique data structure
    setResources({
      totalStorage: 52000,
      inUse: 38500,
      burnRate: 385,
      remainingDays: 100,
      condition: 'HEALTHY',
      reservoirs: [
        { id: 'r1', identifier: 'STOR-α', description: 'Main Storage Unit', volume: 22000, maxVolume: 26000, grade: 'Arctic-A' },
        { id: 'r2', identifier: 'STOR-β', description: 'Auxiliary Tank', volume: 11500, maxVolume: 16000, grade: 'Arctic-A' },
        { id: 'r3', identifier: 'STOR-γ', description: 'Backup Supply', volume: 5000, maxVolume: 10000, grade: 'Arctic-A' }
      ],
      projection: [
        { month: 'Jan', level: 52 },
        { month: 'Feb', level: 48 },
        { month: 'Mar', level: 44 },
        { month: 'Apr', level: 40 },
        { month: 'May', level: 36 },
        { month: 'Jun', level: 32 }
      ]
    });
  };

  const openUpdate = (reservoir) => {
    console.log('Opening edit modal for:', reservoir);
    setEditingResource(reservoir);
    setFormData({ volume: '', maxVolume: '' }); // Reset form
    setUpdateDialog(true);
  };

  const handleInputChange = (field, value) => {
    console.log('Input changed:', field, value);
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      console.log('Updated form data:', updated);
      return updated;
    });
  };

  const saveUpdate = (e) => {
    e.preventDefault();
    
    const updatedVolume = parseFloat(formData.volume || editingResource.volume);
    const updatedMaxVolume = parseFloat(formData.maxVolume || editingResource.maxVolume);
    
    if (isNaN(updatedVolume) || updatedVolume < 0) {
      alert('Please enter a valid positive number for volume');
      return;
    }

    if (isNaN(updatedMaxVolume) || updatedMaxVolume <= 0) {
      alert('Please enter a valid positive number for max capacity');
      return;
    }

    if (updatedVolume > updatedMaxVolume) {
      alert(`Current level (${updatedVolume.toLocaleString()} L) cannot exceed maximum capacity (${updatedMaxVolume.toLocaleString()} L)`);
      return;
    }
    
    // Update local state  
    setResources(prev => {
      const updatedReservoirs = prev.reservoirs.map(r => 
        r.id === editingResource.id 
          ? { ...r, volume: updatedVolume, maxVolume: updatedMaxVolume } 
          : r
      );
      const newTotal = updatedReservoirs.reduce((sum, r) => sum + r.volume, 0);
      const maxTotal = updatedReservoirs.reduce((sum, r) => sum + r.maxVolume, 0);
      const newDays = Math.round(newTotal / prev.burnRate);
      
      return {
        ...prev,
        totalStorage: maxTotal,
        reservoirs: updatedReservoirs,
        inUse: newTotal,
        remainingDays: newDays
      };
    });
    
    setUpdateDialog(false);
    setFormData({ volume: '', maxVolume: '' });
    setEditingResource(null);
    
    console.log('✅ Reservoir updated successfully!');
  };

  const closeModal = () => {
    setUpdateDialog(false);
    setEditingResource(null);
    setFormData({ volume: '', maxVolume: '' });
  };

  if (!resources) {
    return <div className="card animate-pulse"><div className="h-72 bg-slate-200 rounded-xl"></div></div>;
  }

  const usagePercent = Math.round((resources.inUse / resources.totalStorage) * 100);

  return (
    <div className="card-glass">
      {/* ── Headline ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Icon block */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <Droplets className="h-7 w-7 text-white drop-shadow" />
            {/* Live pulse dot */}
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
            </span>
          </div>

          <div>
            {/* Eyebrow */}
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-400">
              Station Supply · Live Tracking
            </p>
            {/* Main headline */}
            <h3 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-white">
              Resource Management
            </h3>
            {/* Sub-label */}
            <p className="mt-0.5 text-xs text-slate-400">
              Supply tracking &amp; consumption analysis
            </p>
          </div>
        </div>

        {/* Condition badge — dark-theme variant */}
        <span className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest ${
          resources.condition === 'HEALTHY'
            ? 'border-emerald-700 bg-emerald-950/50 text-emerald-400'
            : resources.condition === 'MODERATE'
            ? 'border-amber-700 bg-amber-950/50 text-amber-400'
            : 'border-rose-700 bg-rose-950/50 text-rose-400 animate-pulse-slow'
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            resources.condition === 'HEALTHY' ? 'bg-emerald-400'
            : resources.condition === 'MODERATE' ? 'bg-amber-400'
            : 'bg-rose-400'
          }`} />
          {resources.condition}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="text-xs font-bold text-green-700 uppercase">Supply Duration</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-green-900">{resources.remainingDays}</span>
            <span className="text-sm font-bold text-green-600">days</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">Current Stock</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-blue-900">{(resources.inUse / 1000).toFixed(1)}</span>
            <span className="text-sm font-bold text-blue-600">kL</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="rounded-xl p-4 bg-gradient-to-br from-orange-50 to-amber-100 border-2 border-orange-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-700 uppercase">Burn Rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-orange-900">{resources.burnRate}</span>
            <span className="text-sm font-bold text-orange-600">L/d</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="rounded-xl p-4 bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase">Usage</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-purple-900">{usagePercent}</span>
            <span className="text-sm font-bold text-purple-600">%</span>
          </div>
        </motion.div>
      </div>

      {/* Trend Chart */}
      <div className="mb-6 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
        <h4 className="font-heading font-bold text-slate-900 mb-3">6-Month Projection</h4>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={resources.projection}>
            <defs>
              <linearGradient id="resourceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip />
            <Area type="monotone" dataKey="level" stroke="#2563eb" fillOpacity={1} fill="url(#resourceGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Reservoir Table */}
      <div className="rounded-xl overflow-hidden border-2 border-slate-200">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3">
          <h4 className="font-heading font-bold text-white">Storage Reservoirs</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-200">
              <th className="text-left py-3 px-4 font-bold text-slate-700">ID</th>
              <th className="text-left py-3 px-4 font-bold text-slate-700">Name</th>
              <th className="text-right py-3 px-4 font-bold text-slate-700">Volume</th>
              <th className="text-right py-3 px-4 font-bold text-slate-700">Max</th>
              <th className="text-center py-3 px-4 font-bold text-slate-700">Status</th>
              <th className="text-right py-3 px-4 font-bold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.reservoirs.map((res, idx) => {
              const fillLevel = Math.round((res.volume / res.maxVolume) * 100);
              return (
                <motion.tr 
                  key={res.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-3 px-4 font-mono text-sm font-bold text-polar-blue">{res.identifier}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{res.description}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">{res.volume.toLocaleString()} L</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{res.maxVolume.toLocaleString()} L</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full max-w-[100px] bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${fillLevel > 60 ? 'bg-green-500' : fillLevel > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${fillLevel}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold">{fillLevel}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openUpdate(res)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                    >
                      <Pen className="h-3 w-3" />
                      Edit
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Update Modal */}
      <AnimatePresence>
        {updateDialog && editingResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-white">Update Reservoir</h3>
                  <p className="text-slate-300 text-sm mt-1">{editingResource.identifier} • {editingResource.description}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <form onSubmit={saveUpdate} className="p-6 space-y-5">
                {/* Current Volume Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Current Level (Liters)
                  </label>
                  <input
                    key={`volume-${editingResource.id}`}
                    type="text"
                    defaultValue={editingResource.volume}
                    onChange={(e) => handleInputChange('volume', e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl font-mono text-xl font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all bg-white text-slate-900"
                    placeholder="Enter current volume"
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {/* Max Capacity Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Maximum Capacity (Liters)
                  </label>
                  <input
                    key={`maxVolume-${editingResource.id}`}
                    type="text"
                    defaultValue={editingResource.maxVolume}
                    onChange={(e) => handleInputChange('maxVolume', e.target.value)}
                    className="w-full px-5 py-4 border-2 border-slate-300 rounded-2xl font-mono text-xl font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all bg-white text-slate-900"
                    placeholder="Enter maximum capacity"
                    autoComplete="off"
                  />
                </div>

                {/* Preview */}
                <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4">
                  <div className="text-xs font-bold text-blue-700 mb-2 uppercase">Preview</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">Fill Level:</span>
                      <span className="font-bold text-slate-900">
                        {formData.maxVolume > 0 && formData.volume 
                          ? ((parseFloat(formData.volume) / parseFloat(formData.maxVolume)) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: formData.maxVolume > 0 && formData.volume
                            ? `${(parseFloat(formData.volume) / parseFloat(formData.maxVolume)) * 100}%`
                            : '0%'
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
