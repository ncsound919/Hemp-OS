import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CronDaemon Panel Error:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center border border-red-950/40 rounded-3xl bg-[#0a0a0b] space-y-4 max-w-lg mx-auto my-6 shadow-xl">
          <div className="inline-flex p-3 bg-red-950/30 border border-red-500/20 rounded-2xl">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
              Cron System Interrupted
            </h3>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tight max-w-sm mx-auto leading-relaxed">
              An unexpected exception occurred inside the deterministic task loop boundaries.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-black/60 rounded-xl text-[9px] font-mono text-red-400/80 overflow-x-auto text-left max-h-32 border border-red-950/20">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-500/20 text-red-300 font-mono text-[9px] uppercase tracking-wider rounded-xl cursor-pointer transition-all inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset State Boundary
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
