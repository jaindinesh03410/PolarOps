import { useState } from 'react';
import { AlertCircle, Activity, Package, Heart, TrendingDown, Users } from 'lucide-react';

export default function DemoDashboard() {
  const [selectedView, setSelectedView] = useState('hq');

  const demoStats = {
    hq: {
      title: 'HQ Admin Dashboard - Goa',
      stats: [
        { label: 'Critical Alerts', value: '3', color: 'red' },
        { label: 'Combined Risk Alerts', value: '2', color: 'purple' },
        { label: 'Compliance Flags', value: '0', color: 'green' },
        { label: 'Active Stations', value: '3', color: 'blue' }
      ]
    },
    commander: {
      title: 'Station Commander - Maitri Station',
      stats: [
        { label: 'Personnel', value: '18/25', color: 'blue' },
        { label: 'Low Inventory Items', value: '4', color: 'yellow' },
        { label: 'Active Alerts', value: '6', color: 'red' },
        { label: 'Active SOS', value: '0', color: 'green' }
      ]
    },
    logistics: {
      title: 'Logistics Officer Dashboard',
      stats: [
        { label: 'Pending Cargo', value: '5', color: 'blue' },
        { label: 'Computed Routes', value: '12', color: 'green' },
        { label: 'Active Hazards', value: '3', color: 'red' },
        { label: 'Optimizations Run', value: '8', color: 'purple' }
      ]
    },
    medical: {
      title: 'Medical Officer Dashboard',
      stats: [
        { label: 'Active SOS', value: '0', color: 'red' },
        { label: 'Wellness Alerts', value: '2', color: 'yellow' },
        { label: 'Personnel Monitored', value: '42', color: 'blue' },
        { label: 'Health Reports', value: '28', color: 'green' }
      ]
    },
    field: {
      title: 'Field Crew - Mobile Dashboard',
      stats: [
        { label: 'My SOS Triggers', value: '0', color: 'green' },
        { label: 'Wellness Check-ins', value: '15', color: 'blue' },
        { label: 'Offline Actions Queued', value: '0', color: 'gray' },
        { label: 'Days at Station', value: '45', color: 'purple' }
      ]
    }
  };

  const currentView = demoStats[selectedView];

  const getColorClasses = (color) => {
    const colors = {
      red: 'bg-red-50 border-red-200 text-red-800',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-polar text-white shadow-elevation-3">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-display font-bold mb-2">
            Antarctic Research Station Management
          </h1>
          <p className="text-blue-200 text-sm">SIH 2024 - Problem Statement 26062 • Demo Mode</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Role Selector */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Select Dashboard View:</h2>
          <div className="grid grid-cols-5 gap-3">
            {Object.keys(demoStats).map(key => (
              <button
                key={key}
                onClick={() => setSelectedView(key)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedView === key
                    ? 'border-polar-blue bg-polar-blue text-white shadow-elevation-3'
                    : 'border-gray-300 hover:border-polar-blue hover:shadow-elevation-2'
                }`}
              >
                <div className="font-semibold capitalize">{key.replace('_', ' ')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Current Dashboard */}
        <div className="space-y-6 animate-fade-in">
          <h2 className="section-title">
            <Activity className="w-6 h-6 text-polar-blue" />
            {currentView.title}
          </h2>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {currentView.stats.map((stat, idx) => (
              <div key={idx} className={`stat-card ${getColorClasses(stat.color)} animate-slide-up`} 
                   style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="text-sm font-semibold mb-2">{stat.label}</div>
                <div className="data-number">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Feature Showcase */}
          <div className="grid grid-cols-2 gap-6">
            <div className="mission-control-panel">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                <AlertCircle className="w-5 h-5" />
                Key Features Implemented
              </h3>
              <div className="space-y-2 relative z-10">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-white">
                  ✓ Real A* Pathfinding with Hazard Avoidance
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-white">
                  ✓ Trained NLP Emergency Triage (TF-IDF + Naive Bayes)
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-white">
                  ✓ Facebook Prophet Inventory Forecasting
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-white">
                  ✓ 2D Dynamic Programming Cargo Optimization
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-white">
                  ✓ Offline-First PWA with Delta Sync
                </div>
              </div>
            </div>

            <div className="card-glass">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-polar-blue" />
                System Architecture
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                  <span className="font-semibold">Frontend</span>
                  <span className="badge-measured">React + Vite</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                  <span className="font-semibold">Backend API</span>
                  <span className="badge-simulated">Node.js + Express</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                  <span className="font-semibold">ML Service</span>
                  <span className="badge-manual">Python + FastAPI</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/50 rounded">
                  <span className="font-semibold">Database</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Supabase</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Info */}
          <div className="card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Demo Mode Active
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              This is a demonstration view showing the UI/UX design system. For full functionality:
            </p>
            <ol className="text-sm space-y-2 text-gray-700">
              <li>1. Set up Supabase project (see WINDOWS_QUICKSTART.md)</li>
              <li>2. Configure .env files with your credentials</li>
              <li>3. Start Backend API: <code className="bg-white px-2 py-1 rounded font-mono text-xs">npm run dev</code></li>
              <li>4. Start ML Service: <code className="bg-white px-2 py-1 rounded font-mono text-xs">uvicorn main:app --reload</code></li>
              <li>5. Disable demo mode in AuthContext.jsx</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
