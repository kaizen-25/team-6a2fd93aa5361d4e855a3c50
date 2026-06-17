'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorTimestamp: string | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorTimestamp: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorTimestamp: new Date().toLocaleString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleHardReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-page">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h1>Something went wrong</h1>
            <p className="error-boundary-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {this.state.errorTimestamp && (
              <p className="error-boundary-timestamp">
                Error occurred at: {this.state.errorTimestamp}
              </p>
            )}
            <div className="error-boundary-actions">
              <button
                className="btn btn-primary"
                onClick={this.handleHardReload}
                id="hard-reload-btn"
              >
                🔄 Hard Reload
              </button>
              <button
                className="btn btn-secondary"
                onClick={this.handleGoHome}
                id="go-home-btn"
              >
                🏠 Go Home
              </button>
            </div>
            <p className="error-boundary-hint">
              If this issue persists, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
