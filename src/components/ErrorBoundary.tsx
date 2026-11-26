import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Ocorreu um erro inesperado no aplicativo.',
    };
  }

  render() {
    if (this.state.hasError) {
      let displayMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string; path?: string };
        if (parsed.error) {
          displayMsg = `${parsed.error} (${parsed.operationType || ''} ${parsed.path || ''})`;
        }
      } catch {
        // plain string
      }

      return (
        <div className="min-h-screen bg-[#0B0E14] text-[#F3F4F6] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#12161F] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Erro na Sessão</h2>
            <p className="text-sm text-gray-300 break-words font-mono bg-black/30 p-3 rounded-lg border border-white/10">
              {displayMsg}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Recarregar Emulador
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
