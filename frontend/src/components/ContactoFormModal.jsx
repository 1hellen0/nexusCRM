import React, { useState, useEffect } from 'react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function ContactoFormModal({
  isOpen,
  onClose,
  onSave,
  contactoToEdit,
  isSubmitting,
  empresas = [],
  onNavigateToEmpresas
}) {
  const isEditMode = Boolean(contactoToEdit && contactoToEdit.id_contacto);

  const [formData, setFormData] = useState({
    id_empresa: '',
    nombre: '',
    cargo: '',
    correo: '',
    telefono: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        id_empresa: contactoToEdit.id_empresa ? String(contactoToEdit.id_empresa) : '',
        nombre: contactoToEdit.nombre || '',
        cargo: contactoToEdit.cargo || '',
        correo: contactoToEdit.correo || '',
        telefono: contactoToEdit.telefono || ''
      });
    } else {
      setFormData({
        id_empresa: empresas.length > 0 ? String(empresas[0].id_empresa) : '',
        nombre: '',
        cargo: '',
        correo: '',
        telefono: ''
      });
    }
    setErrors({});
  }, [contactoToEdit, isEditMode, isOpen, empresas]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const nombre = formData.nombre.trim();
    const cargo = formData.cargo.trim();
    const correo = formData.correo.trim();
    const telefono = formData.telefono.trim();

    if (!formData.id_empresa) {
      errs.id_empresa = 'Debe seleccionar una empresa cliente.';
    }

    if (!nombre) {
      errs.nombre = 'El nombre del contacto es obligatorio.';
    } else if (nombre.length > 120) {
      errs.nombre = 'El nombre no puede superar los 120 caracteres.';
    }

    if (cargo && cargo.length > 100) {
      errs.cargo = 'El cargo no puede superar los 100 caracteres.';
    }

    if (!correo) {
      errs.correo = 'El correo electrónico es obligatorio.';
    } else if (!EMAIL_REGEX.test(correo)) {
      errs.correo = 'El formato del correo electrónico no es válido.';
    } else if (correo.length > 150) {
      errs.correo = 'El correo electrónico no puede superar los 150 caracteres.';
    }

    if (telefono && telefono.length > 20) {
      errs.telefono = 'El teléfono no puede superar los 20 caracteres.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Preparamos payload estricto respetando campos permitidos del backend
    const payload = {
      id_empresa: parseInt(formData.id_empresa, 10),
      nombre: formData.nombre.trim(),
      cargo: formData.cargo.trim() ? formData.cargo.trim() : null,
      correo: formData.correo.trim(),
      telefono: formData.telefono.trim() ? formData.telefono.trim() : null
    };

    onSave(payload);
  };

  const hasNoEmpresas = empresas.length === 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="contacto-modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h3 id="contacto-modal-title" className="modal-title">
              {isEditMode ? 'Editar Contacto' : 'Nuevo Contacto'}
            </h3>
            <p className="modal-subtitle">
              {isEditMode
                ? `Actualizando datos del contacto ID #${contactoToEdit.id_contacto}`
                : 'Registre un nuevo ejecutivo o tomador de decisiones B2B'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Si no hay empresas registradas, advertencia y bloqueo de creación */}
            {hasNoEmpresas && (
              <div className="alert alert-danger" role="alert">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <strong>No existen empresas registradas:</strong> Para crear un contacto, primero debe registrar al menos una Empresa Cliente.
                  {onNavigateToEmpresas && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          onClose();
                          onNavigateToEmpresas();
                        }}
                      >
                        Ir a Registrar Empresa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadatos de solo lectura en edición */}
            {isEditMode && (
              <div className="read-only-meta">
                <div className="meta-badge">
                  <span className="meta-label">ID Contacto:</span>
                  <span className="meta-val">#{contactoToEdit.id_contacto}</span>
                </div>
                {contactoToEdit.fecha_registro && (
                  <div className="meta-badge">
                    <span className="meta-label">Fecha Registro:</span>
                    <span className="meta-val">
                      {new Date(contactoToEdit.fecha_registro).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Selector de Empresa */}
            <div className="form-group">
              <label htmlFor="contacto-id_empresa" className="form-label">
                Empresa Cliente Vinculada <span className="text-danger">*</span>
              </label>
              <select
                id="contacto-id_empresa"
                name="id_empresa"
                className={`form-select ${errors.id_empresa ? 'input-error' : ''}`}
                value={formData.id_empresa}
                onChange={handleChange}
                disabled={isSubmitting || hasNoEmpresas}
              >
                <option value="">-- Seleccione una empresa --</option>
                {empresas.map(emp => (
                  <option key={emp.id_empresa} value={emp.id_empresa}>
                    #{emp.id_empresa} - {emp.nombre} ({emp.sector})
                  </option>
                ))}
              </select>
              {errors.id_empresa && <span className="field-error">{errors.id_empresa}</span>}
            </div>

            {/* Nombre */}
            <div className="form-group">
              <label htmlFor="contacto-nombre" className="form-label">
                Nombre Completo <span className="text-danger">*</span>
              </label>
              <input
                id="contacto-nombre"
                name="nombre"
                type="text"
                className={`form-input ${errors.nombre ? 'input-error' : ''}`}
                placeholder="Ej. Ing. Laura Gómez"
                value={formData.nombre}
                onChange={handleChange}
                maxLength={120}
                disabled={isSubmitting || hasNoEmpresas}
                autoFocus={!hasNoEmpresas}
              />
              {errors.nombre && <span className="field-error">{errors.nombre}</span>}
              <div className="field-counter">{formData.nombre.length}/120</div>
            </div>

            {/* Cargo */}
            <div className="form-group">
              <label htmlFor="contacto-cargo" className="form-label">
                Cargo / Puesto Ejecutivo
              </label>
              <input
                id="contacto-cargo"
                name="cargo"
                type="text"
                className={`form-input ${errors.cargo ? 'input-error' : ''}`}
                placeholder="Ej. Directora de Finanzas, Gerente de Compras..."
                value={formData.cargo}
                onChange={handleChange}
                maxLength={100}
                disabled={isSubmitting || hasNoEmpresas}
              />
              {errors.cargo && <span className="field-error">{errors.cargo}</span>}
              <div className="field-counter">{formData.cargo.length}/100</div>
            </div>

            {/* Correo y Teléfono en dos columnas */}
            <div className="form-row">
              <div className="form-group col-half">
                <label htmlFor="contacto-correo" className="form-label">
                  Correo Electrónico <span className="text-danger">*</span>
                </label>
                <input
                  id="contacto-correo"
                  name="correo"
                  type="email"
                  className={`form-input ${errors.correo ? 'input-error' : ''}`}
                  placeholder="laura.gomez@empresa.com"
                  value={formData.correo}
                  onChange={handleChange}
                  maxLength={150}
                  disabled={isSubmitting || hasNoEmpresas}
                />
                {errors.correo && <span className="field-error">{errors.correo}</span>}
              </div>

              <div className="form-group col-half">
                <label htmlFor="contacto-telefono" className="form-label">
                  Teléfono
                </label>
                <input
                  id="contacto-telefono"
                  name="telefono"
                  type="text"
                  className={`form-input ${errors.telefono ? 'input-error' : ''}`}
                  placeholder="+52 55 9876 5432"
                  value={formData.telefono}
                  onChange={handleChange}
                  maxLength={20}
                  disabled={isSubmitting || hasNoEmpresas}
                />
                {errors.telefono && <span className="field-error">{errors.telefono}</span>}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || hasNoEmpresas}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-inline"></span>
                  {isEditMode ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Contacto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

