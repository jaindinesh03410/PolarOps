import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, Radio, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const notificationIcons = {
  alert:   AlertTriangle,
  info:    Radio,
  success: CheckCircle2,
};

const notificationColors = {
  alert:   'text-rose-600',
  info:    'text-sky-600',
  success: 'text-emerald-600',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationDropdown({ notifications = [], onDismiss }) {
  const [isOpen, setIsOpen] = useState(false);
  // Local shadow of read state — updated optimistically on dismiss so the
  // badge count drops immediately without waiting for a network round-trip.
  const [localRead, setLocalRead] = useState({});
  const dropdownRef = useRef(null);

  // Reset local overrides whenever the parent provides fresh data
  useEffect(() => { setLocalRead({}); }, [notifications]);

  // Merge server read flag with any local optimistic overrides
  const isRead = useCallback(
    (n) => localRead[n.id] === true || n.read,
    [localRead]
  );

  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDismiss = useCallback((id) => {
    // Optimistic: mark read locally right away so badge updates instantly
    setLocalRead((prev) => ({ ...prev, [id]: true }));
    // Propagate to parent (Layout.jsx) which removes the item + calls API
    onDismiss?.(id);
  }, [onDismiss]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1.5 rounded-md border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
      >
        <Bell size={18} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 font-bold text-white"
              style={{ fontSize: 10 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h4 className="text-sm font-bold text-slate-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                    {unreadCount} new
                  </span>
                )}
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No new notifications
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      read={isRead(notification)}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function NotificationItem({ notification, read, onDismiss }) {
  const Icon = notificationIcons[notification.type] || Radio;
  const iconColor = notificationColors[notification.type] || 'text-slate-500';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`group border-b border-slate-50 transition-colors last:border-b-0 ${
        !read ? 'bg-slate-50/60' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 rounded-md border p-1.5 ${
          !read
            ? 'border-slate-200 bg-white shadow-sm'
            : 'border-transparent bg-slate-50'
        }`}>
          <Icon size={14} className={iconColor} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h5 className={`text-xs font-bold leading-tight ${
              !read ? 'text-slate-900' : 'text-slate-600'
            }`}>
              {notification.title}
            </h5>
            <span className="flex-shrink-0 font-medium text-slate-400"
              style={{ fontSize: 9 }}>
              {notification.time}
            </span>
          </div>
          {notification.description && (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              {notification.description}
            </p>
          )}
        </div>

        {/* Dismiss (X) button — visible on hover or when unread */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.(notification.id);
          }}
          className={`flex-shrink-0 rounded p-0.5 transition-colors ${
            !read
              ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-500'
              : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500'
          }`}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}
