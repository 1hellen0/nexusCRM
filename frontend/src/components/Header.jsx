import React from 'react';
import ApiStatusBadge from './ApiStatusBadge';

export default function Header({ apiState, onRetryHealth, user, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand">
          <div className="brand-icon">💼</div>
          <div className="brand-text">
            <h1 className="brand-title">NexusCRM</h1>
            <span className="brand-subtitle">Gestión Comercial B2B &middot; Servicios Empresariales</span>
          </div>
        </div>
        <div className="header-actions">
          {user && (
            <div className="user-profile-menu">
              <div className="user-info-chip" title={user.correo}>
                <span className="user-avatar-icon">👤</span>
                <span className="user-name-text">{user.nombre}</span>
              </div>
              <button
                type="button"
                className="btn-logout"
                onClick={onLogout}
                title="Cerrar sesión"
              >
                <span>Cerrar sesión</span>
                <span className="logout-icon" aria-hidden="true">🚪</span>
              </button>
            </div>
          )}
          <ApiStatusBadge
            status={apiState.data}
            loading={apiState.loading}
            error={apiState.error}
            onRetry={onRetryHealth}
          />
        </div>
      </div>
    </header>
  );
}
