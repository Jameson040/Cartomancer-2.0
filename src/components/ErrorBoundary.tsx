import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-6 text-white z-[99999]">
          <div className="max-w-md w-full bg-[#1e293b] border border-amber-600/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold font-serif text-amber-200 mb-2">Cartographer Interface Notice</h2>
            <p className="text-xs text-slate-400 mb-4">
              A temporary interface error occurred. Your map drafts and assets are safely stored in your browser.
            </p>
            {this.state.error && (
              <div className="w-full text-left bg-black/40 rounded-lg p-2.5 text-[11px] font-mono text-rose-300 max-h-24 overflow-y-auto mb-4 border border-rose-900/40">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restore Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
