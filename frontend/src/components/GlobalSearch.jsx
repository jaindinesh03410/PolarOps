import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Users, Package, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const categories = {
  stations: { icon: MapPin, color: 'text-blue-500' },
  personnel: { icon: Users, color: 'text-green-500' },
  inventory: { icon: Package, color: 'text-purple-500' },
  alerts: { icon: AlertTriangle, color: 'text-rose-500' },
};

export default function GlobalSearch({ data = {} }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(data).forEach(([category, items]) => {
      if (!Array.isArray(items)) return;
      
      items.forEach(item => {
        const searchableText = JSON.stringify(item).toLowerCase();
        if (searchableText.includes(lowerQuery)) {
          searchResults.push({ category, item });
        }
      });
    });

    setResults(searchResults.slice(0, 10));
  }, [query, data]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result) => {
    setShowResults(false);
    setQuery('');
    // Navigate based on category
    if (result.category === 'stations' && result.item.id) {
      navigate(`/station/${result.item.id}`);
    }
  };

  const CategoryIcon = (category) => {
    const config = categories[category] || {};
    const Icon = config.icon || Search;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search... (Ctrl+K)"
          className="w-full pl-10 pr-20 py-2.5 bg-white/5 border border-white/10 rounded-lg text-ice-white placeholder-slate-400 focus:ring-2 focus:ring-polar-blue focus:border-transparent transition-all"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <kbd className="hidden sm:block px-2 py-1 text-xs font-mono bg-white/10 rounded border border-white/20 text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      <AnimatePresence>
        {showResults && results.length > 0 && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowResults(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full bg-polar-dark-lighter border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto"
            >
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  {CategoryIcon(result.category)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ice-white truncate">
                      {result.item.name || result.item.full_name || result.item.item_name || result.item.title}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">{result.category}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
