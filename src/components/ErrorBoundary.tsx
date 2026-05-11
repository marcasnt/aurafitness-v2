import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function isExtensionError(error?: Error): boolean {
  if (!error) return false;
  const msg = error.message || '';
  return (
    msg.includes('Ruler is not defined') ||
    msg.includes('PageRuler') ||
    msg.includes('chrome-extension') ||
    msg.includes('moz-extension') ||
    msg.includes('safari-extension')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  private autoRecoverTimer?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (!prevState.hasError && this.state.hasError && isExtensionError(this.state.error)) {
      // Si el error es de una extension, intentar auto-recuperarse despues de 1.5s
      // dandole tiempo al usuario de ver el mensaje.
      this.autoRecoverTimer = setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 1500);
    }
  }

  componentWillUnmount() {
    if (this.autoRecoverTimer) clearTimeout(this.autoRecoverTimer);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const extError = isExtensionError(this.state.error);
      return (
        <div className="min-h-screen bg-[#0a0a0c] text-[#e4e2e6] flex flex-col items-center justify-center p-6">
          <div className="bg-[#141416] border border-[#27272a] rounded-[16px] p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-[#ff5449]/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-white">Algo salió mal</h2>
            {extError ? (
              <p className="text-xs text-[#e5ba73]">
                Detectamos que una <strong>extensión de tu navegador</strong> está causando conflictos.
                Desactivá temporalmente extensiones como "Page Ruler" o abrí la app en una ventana de incógnito.
              </p>
            ) : (
              <p className="text-xs text-[#8e8e93]">
                La app encontró un error inesperado. Puedes intentar recargar o volver atrás.
              </p>
            )}
            {this.state.error && (
              <div className="bg-[#0a0a0c] rounded-[8px] p-3 text-left overflow-auto max-h-32">
                <code className="text-[10px] text-[#ff5449] font-mono break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="bg-[#27272a] text-white text-xs font-semibold px-4 py-2.5 rounded-[8px] hover:bg-[#3f3f46] transition-all"
              >
                {extError ? 'Continuar (auto en 1.5s)' : 'Intentar de nuevo'}
              </button>
              <button
                onClick={this.handleReload}
                className="bg-[#d4f826] text-black text-xs font-semibold px-4 py-2.5 rounded-[8px] hover:bg-[#e2fa52] transition-all"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
