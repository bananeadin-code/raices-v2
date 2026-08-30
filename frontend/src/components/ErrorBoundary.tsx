import { Component, ReactNode } from 'react';

// Captura errores de render de las pantallas para que no se caiga toda la app.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('Error en la app:', error); }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 560 }}>
          <h1>Algo salió mal</h1>
          <p style={{ color: 'var(--ink-500)', marginTop: 8 }}>
            Ocurrió un error al mostrar esta pantalla. Puedes recargar para continuar.
          </p>
          <button className="primario" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
