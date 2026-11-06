import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onNavigateToRegister, initialMessage = null }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(initialMessage);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!formData.correo.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await login(formData.correo.trim(), formData.password);
      // Al ser exitoso, AuthContext actualiza user y token, provocando el render del Dashboard
    } catch (err) {
      const msg = err.data?.error || err.data?.message || err.message || 'Error al iniciar sesión.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-badge">💼</div>
          <h2 className="auth-title">Iniciar Sesión</h2>
          <p className="auth-subtitle">Acceso seguro a NexusCRM &middot; Gestión Comercial B2B</p>
        </div>

        {infoMessage && (
          <div className="alert alert-success auth-alert">
            <span className="alert-icon">✓</span>
            <div className="alert-body">{infoMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger auth-alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-body">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-correo" className="form-label">
              Correo Electrónico <span className="required-star">*</span>
            </label>
            <input
              id="login-correo"
              type="email"
              name="correo"
              className="form-input"
              placeholder="ejemplo@empresa.com"
              value={formData.correo}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Contraseña <span className="required-star">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block btn-auth-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="dot pulse-white mr-2"></span>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            ¿No tienes una cuenta aún?{' '}
            <button
              type="button"
              className="btn-auth-link"
              onClick={onNavigateToRegister}
              disabled={submitting}
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

