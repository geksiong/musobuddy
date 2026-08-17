/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScoreErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ScoreErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-red-500/20 bg-red-500/5 my-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-red-500 mb-1">
            {this.props.fallbackTitle || 'Score Renderer Error'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
            {this.state.error?.message || 'An error occurred while displaying the score. The file format or content might be incompatible.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Renderer</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ScoreErrorBoundary;
