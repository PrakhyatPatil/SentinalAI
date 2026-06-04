import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[SafeRoute ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? 'Unknown error';
      const isApiKey = msg.includes('API key') || msg.includes('apiKey') || msg.includes('INVALID_ARGUMENT');
      return (
        <div className="load-error">
          <div className="load-error__card">
            <div className="load-error__icon">{isApiKey ? '🔑' : '💥'}</div>
            <h2>{isApiKey ? 'Invalid or Missing API Keys' : 'Something went wrong'}</h2>
            {isApiKey ? (
              <>
                <p>Your <code>.env.local</code> file appears to be empty or has placeholder values.</p>
                <p>Fill in all <code>VITE_*</code> keys and save — Vite will hot-reload automatically.</p>
              </>
            ) : (
              <p className="load-error__detail">{msg}</p>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                marginTop: 16,
                padding: '10px 20px',
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
