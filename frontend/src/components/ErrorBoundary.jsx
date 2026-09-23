import { Component } from 'react';
import { Snowflake, RefreshCw, Terminal } from 'lucide-react';

/**
 * ErrorBoundary
 * Catches any render-time JS error below it in the tree, logs the full
 * error + componentStack, and shows a visible fallback instead of a blank
 * white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourTree />
 *   </ErrorBoundary>
 *
 * Optional props:
 *   fallbackMessage  string  — shown below the error message (defaults to generic advice)
 *   onError          fn      — called with (error, errorInfo) if you want external reporting
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:   false,
      error:      null,
      errorInfo:  null,
      showStack:  false,
    };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  static getDerivedStateFromError(error) {
    // Update state so the fallback UI renders on next paint
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Full error + component stack — the main diagnostic tool for white screens
    console.error(
      '🚨 [ErrorBoundary] Uncaught render error\n',
      error,
      '\nComponent stack:\n',
      errorInfo.componentStack,
    );

    this.setState({ errorInfo });

    // Optional external handler (e.g. Sentry, analytics)
    this.props.onError?.(error, errorInfo);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  handleReload = () => window.location.reload();

  handleReset = () =>
    this.setState({ hasError: false, error: null, errorInfo: null, showStack: false });

  toggleStack = () => this.setState(s => ({ showStack: !s.showStack }));

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo, showStack } = this.state;
    const { fallbackMessage } = this.props;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-polar-dark p-6">
        {/* Background glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-700 bg-rose-950/60">
              <Snowflake className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-rose-500">
                Antarctic Station Ops · SIH 26062
              </p>
              <h1 className="font-display text-lg font-bold text-white">
                Application Error
              </h1>
            </div>
          </div>

          {/* Error card */}
          <div className="rounded-2xl border border-rose-800/60 bg-rose-950/20 p-6 backdrop-blur-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-rose-500">
              {error?.name || 'Error'}
            </p>
            <p className="font-mono text-sm text-rose-200 break-words">
              {error?.message || 'An unexpected error occurred.'}
            </p>

            {fallbackMessage && (
              <p className="mt-3 text-sm text-slate-400">{fallbackMessage}</p>
            )}

            {/* Component stack toggle */}
            {errorInfo?.componentStack && (
              <div className="mt-4">
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
                >
                  <Terminal className="h-3 w-3" />
                  {showStack ? 'Hide' : 'Show'} component stack
                </button>

                {showStack && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-white/5 bg-black/50 p-3 font-mono text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
                    {errorInfo.componentStack.trim()}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={this.handleReload}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-polar-blue to-sky-500 px-4 py-2.5 font-display text-sm font-semibold text-white shadow-elevation-3 transition hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-display text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Try again
            </button>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] text-slate-600">
            Full error details logged to browser console (F12 → Console)
          </p>
        </div>
      </div>
    );
  }
}
