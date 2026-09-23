import { Search, X, Package, Users, MapPin, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function SearchBar({ placeholder = "Search...", onSearch, className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setLoading(true);
      try {
        // Search across multiple data sources
        const [inventory, personnel, alerts] = await Promise.all([
          api.searchInventory(query).catch(() => []),
          api.searchPersonnel(query).catch(() => []),
          api.searchAlerts(query).catch(() => [])
        ]);

        const searchResults = [
          ...inventory.map(item => ({ type: 'inventory', data: item, label: item.item_name, sublabel: `${item.current_quantity} ${item.unit}` })),
          ...personnel.map(person => ({ type: 'personnel', data: person, label: person.full_name, sublabel: person.role })),
          ...alerts.map(alert => ({ type: 'alert', data: alert, label: alert.title, sublabel: alert.severity }))
        ];

        setResults(searchResults.slice(0, 8));
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
    onSearch?.(value);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    onSearch?.('');
  };

  const getIcon = (type) => {
    switch (type) {
      case 'inventory': return <Package className="h-4 w-4 text-purple-500" />;
      case 'personnel': return <Users className="h-4 w-4 text-emerald-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      default: return <MapPin className="h-4 w-4 text-sky-500" />;
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query && setShowResults(true)}
        placeholder={placeholder}
        className="pl-9 pr-9 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-polar-blue w-full transition-all text-ice-white placeholder-slate-400"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors z-10"
        >
          <X size={14} />
        </button>
      )}

      <AnimatePresence>
        {showResults && query && (results.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-polar-dark-lighter border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setShowResults(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  {getIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ice-white truncate">
                      {result.label}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">{result.sublabel}</div>
                  </div>
                  <div className="text-xs text-slate-500 capitalize">{result.type}</div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No results found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
