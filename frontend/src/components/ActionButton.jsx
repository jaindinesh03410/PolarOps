import { Loader2, Check } from 'lucide-react';
import { useState } from 'react';

export default function ActionButton({ 
  children, 
  icon: Icon, 
  onClick, 
  variant = 'primary',
  successMessage = 'Success',
  loadingMessage = 'Processing...',
  className = ''
}) {
  const [state, setState] = useState('idle'); // idle | running | success

  const handleClick = async () => {
    if (state === 'running') return;
    
    setState('running');
    try {
      await onClick?.();
      setState('success');
      setTimeout(() => setState('idle'), 2500);
    } catch (error) {
      setState('idle');
      throw error;
    }
  };

  const variants = {
    primary: state === 'success' 
      ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
      : 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: state === 'success'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === 'running'}
      className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 min-w-[140px] border ${variants[variant]} disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
    >
      {state === 'idle' && (
        <>
          {Icon && <Icon size={14} />}
          {children}
        </>
      )}
      {state === 'running' && (
        <>
          <Loader2 size={14} className="animate-spin" />
          {loadingMessage}
        </>
      )}
      {state === 'success' && (
        <>
          <Check size={14} />
          {successMessage}
        </>
      )}
    </button>
  );
}
