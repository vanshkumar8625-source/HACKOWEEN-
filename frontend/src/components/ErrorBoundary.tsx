import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center text-warm-white p-10 font-sans">
          <AlertCircle className="w-20 h-20 text-rescue-red mb-6" />
          <h1 className="text-3xl font-display font-bold text-rescue-red mb-4">SYSTEM FAILURE</h1>
          <p className="text-steel-gray mb-6 text-center max-w-lg">
            A critical UI exception occurred. Please report this to the engineering team.
          </p>
          <div className="bg-zinc-900 p-6 rounded border border-zinc-800 text-left max-w-4xl w-full overflow-auto">
            <h3 className="text-rescue-red font-bold mb-2">{this.state.error?.toString()}</h3>
            <pre className="text-xs text-steel-gray whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-warm-white rounded transition-colors cursor-pointer"
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
