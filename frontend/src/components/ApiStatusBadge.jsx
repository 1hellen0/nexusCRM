import React from 'react';

export default function ApiStatusBadge({ status, loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="status-badge status-loading">
        <span className="dot pulse-blue"></span>
        <span>Conectando con API...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="status-badge status-error">
        <span className="dot bg-red"></span>
        <span>API Desconectada</span>
        {onRetry && (
          <button onClick={onRetry} className="retry-btn" title="Reintentar conexión">
            ↻
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="status-badge status-success">
      <span className="dot pulse-green"></span>
      <span className="status-text">
        <strong>{status.service || 'NexusCRM API'}</strong>: {status.database === 'connected' ? 'MySQL Conectado' : 'Conectado'}
      </span>
    </div>
  );
}

