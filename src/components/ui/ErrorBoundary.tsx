import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../shadcn/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error ke console atau service monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="ui-dashboard-page min-h-screen bg-[var(--wf-board)] flex items-center justify-center p-4">
          <div className="bg-[var(--wf-board)] rounded-2xl p-8 max-w-md w-full shadow-xl text-center">
            <div className="w-16 h-16 mx-auto bg-[var(--wf-danger)]/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--wf-ink)] mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-[var(--wf-ink-muted)] text-sm mb-6">
              Maaf, aplikasi mengalami masalah. Silakan muat ulang halaman.
            </p>
            <Button
              variant="default"
              onClick={this.handleReset}
              className="h-auto! rounded-xl border-0 bg-[var(--wf-accent)] px-6 py-2.5 text-[1rem] text-[var(--wf-accent-ink)] transition-colors hover:bg-primary active:translate-y-0!"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
