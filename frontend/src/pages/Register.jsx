import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register({ onNavigateToLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const validate = () => {
    if (!formData.nombre.trim()) {
      return 'El nombre es obligatorio.';
    }
    if (formData.nombre.trim().length > 120) {
      return 'El nombre no puede exceder 120 caracteres.';
    }

    if (!formData.correo.trim()) {
      return 'El correo electrónico es obligatorio.';
    }
    if (formData.correo.trim().length > 150) {
      return 'El correo no puede exceder 150 caracteres.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo.trim())) {
      return 'El correo electrónico no tiene un formato válido.';
    }

    if (!formData.password) {
      return 'La contraseña es obligatoria.';
    }
    if (formData.password.length < 8) {
      return 'La contraseña debe tener un mínimo de 8 caracteres.';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const clientError = validate();
    if (clientError) {
      setErrorMessage(clientError);
      return;
    }

    setSubmitting(true);
    try {
      await register(formData.nombre.trim(), formData.correo.trim(), formData.password);
      // Redirigir al login con mensaje instructivo
      onNavigateToLogin('¡Cuenta registrada exitosamente! Por favor ingresa con tus credenciales.');
    } catch (err) {
      const msg = err.data?.error || err.data?.message || err.message || 'Error al procesar el registro.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-badge">📝</div>
          <h2 className="auth-title">Crear Cuenta</h2>
          <p className="auth-subtitle">Regístrate para gestionar operaciones en NexusCRM</p>
        </div>

        {errorMessage && (
          <div className="alert alert-danger auth-alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-body">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-nombre" className="form-label">
              Nombre Completo <span className="required-star">*</span>
            </label>
            <input
              id="reg-nombre"
              type="text"
              name="nombre"
              className="form-input"
              placeholder="Ej. Ana Morales"
              value={formData.nombre}
              onChange={handleChange}
              disabled={submitting}
              maxLength={120}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-correo" className="form-label">
              Correo Electrónico <span className="required-star">*</span>
            </label>
            <input
              id="reg-correo"
              type="email"
              name="correo"
              className="form-input"
              placeholder="ana.morales@empresa.com"
              value={formData.correo}
              onChange={handleChange}
              disabled={submitting}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              Contraseña <span className="required-star">*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              name="password"
              className="form-input"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              disabled={submitting}
              required
            />
            <small className="form-help">Debe contener al menos 8 caracteres.</small>
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirmPassword" className="form-label">
              Confirmar Contraseña <span className="required-star">*</span>
            </label>
            <input
              id="reg-confirmPassword"
              type="password"
              name="confirmPassword"
              className="form-input"
              placeholder="Repite la contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={submitting}
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
                  <span>Registrando usuario...</span>
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes una cuenta registrada?{' '}
            <button
              type="button"
              className="btn-auth-link"
              onClick={() => onNavigateToLogin(null)}
              disabled={submitting}
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

