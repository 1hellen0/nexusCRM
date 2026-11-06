import React, { useState, useEffect } from 'react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const VALID_ESTADOS = ['Prospecto', 'Activo', 'Inactivo'];

export default function EmpresaFormModal({ isOpen, onClose, onSave, empresaToEdit, isSubmitting }) {
  const isEditMode = Boolean(empresaToEdit && empresaToEdit.id_empresa);

  const [formData, setFormData] = useState({
    nombre: '',
    sector: '',
    correo: '',
    telefono: '',
    estado: 'Prospecto'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        nombre: empresaToEdit.nombre || '',
        sector: empresaToEdit.sector || '',
        correo: empresaToEdit.correo || '',
        telefono: empresaToEdit.telefono || '',
        estado: empresaToEdit.estado || 'Prospecto'
      });
    } else {
      setFormData({
        nombre: '',
        sector: '',
        correo: '',
        telefono: '',
        estado: 'Prospecto'
      });
    }
    setErrors({});
  }, [empresaToEdit, isEditMode, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const nombre = formData.nombre.trim();
    const sector = formData.sector.trim();
    const correo = formData.correo.trim();
    const telefono = formData.telefono.trim();

    if (!nombre) {
      errs.nombre = 'El nombre de la empresa es obligatorio.';
    } else if (nombre.length > 150) {
      errs.nombre = 'El nombre no puede superar los 150 caracteres.';
    }

    if (!sector) {
      errs.sector = 'El sector de la empresa es obligatorio.';
    } else if (sector.length > 100) {
      errs.sector = 'El sector no puede superar los 100 caracteres.';
    }

    if (correo) {
      if (!EMAIL_REGEX.test(correo)) {
        errs.correo = 'El formato del correo electrónico no es válido.';
      } else if (correo.length > 150) {
        errs.correo = 'El correo no puede superar los 150 caracteres.';
      }
    }

    if (telefono && telefono.length > 20) {
      errs.telefono = 'El teléfono no puede superar los 20 caracteres.';
    }

    if (!VALID_ESTADOS.includes(formData.estado)) {
      errs.estado = 'Seleccione un estado válido.';
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

    // Preparamos payload limpio sin atributos protegidos
    const payload = {
      nombre: formData.nombre.trim(),
      sector: formData.sector.trim(),
      correo: formData.correo.trim() ? formData.correo.trim() : null,
      telefono: formData.telefono.trim() ? formData.telefono.trim() : null,
      estado: formData.estado
    };

    onSave(payload);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="empresa-modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h3 id="empresa-modal-title" className="modal-title">
              {isEditMode ? 'Editar Empresa' : 'Nueva Empresa'}
            </h3>
            <p className="modal-subtitle">
              {isEditMode
                ? `Actualizando datos de la empresa ID #${empresaToEdit.id_empresa}`
                : 'Registre una nueva empresa cliente en el CRM'}
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
            {/* Si está en edición, mostramos id y fecha como solo lectura */}
            {isEditMode && (
              <div className="read-only-meta">
                <div className="meta-badge">
                  <span className="meta-label">ID Empresa:</span>
                  <span className="meta-val">#{empresaToEdit.id_empresa}</span>
                </div>
                {empresaToEdit.fecha_registro && (
                  <div className="meta-badge">
                    <span className="meta-label">Fecha Registro:</span>
                    <span className="meta-val">
                      {new Date(empresaToEdit.fecha_registro).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="empresa-nombre" className="form-label">
                Nombre de la Empresa <span className="text-danger">*</span>
              </label>
              <input
                id="empresa-nombre"
                name="nombre"
                type="text"
                className={`form-input ${errors.nombre ? 'input-error' : ''}`}
                placeholder="Ej. Grupo Industrial Monterrey S.A."
                value={formData.nombre}
                onChange={handleChange}
                maxLength={150}
                disabled={isSubmitting}
                autoFocus
              />
              {errors.nombre && <span className="field-error">{errors.nombre}</span>}
              <div className="field-counter">{formData.nombre.length}/150</div>
            </div>

            <div className="form-group">
              <label htmlFor="empresa-sector" className="form-label">
                Sector Comercial / Industria <span className="text-danger">*</span>
              </label>
              <input
                id="empresa-sector"
                name="sector"
                type="text"
                className={`form-input ${errors.sector ? 'input-error' : ''}`}
                placeholder="Ej. Manufactura, Tecnología, Logística..."
                value={formData.sector}
                onChange={handleChange}
                maxLength={100}
                disabled={isSubmitting}
              />
              {errors.sector && <span className="field-error">{errors.sector}</span>}
              <div className="field-counter">{formData.sector.length}/100</div>
            </div>

            <div className="form-row">
              <div className="form-group col-half">
                <label htmlFor="empresa-correo" className="form-label">
                  Correo Electrónico
                </label>
                <input
                  id="empresa-correo"
                  name="correo"
                  type="email"
                  className={`form-input ${errors.correo ? 'input-error' : ''}`}
                  placeholder="contacto@empresa.com"
                  value={formData.correo}
                  onChange={handleChange}
                  maxLength={150}
                  disabled={isSubmitting}
                />
                {errors.correo && <span className="field-error">{errors.correo}</span>}
              </div>

              <div className="form-group col-half">
                <label htmlFor="empresa-telefono" className="form-label">
                  Teléfono
                </label>
                <input
                  id="empresa-telefono"
                  name="telefono"
                  type="text"
                  className={`form-input ${errors.telefono ? 'input-error' : ''}`}
                  placeholder="+52 55 1234 5678"
                  value={formData.telefono}
                  onChange={handleChange}
                  maxLength={20}
                  disabled={isSubmitting}
                />
                {errors.telefono && <span className="field-error">{errors.telefono}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="empresa-estado" className="form-label">
                Estado Comercial <span className="text-danger">*</span>
              </label>
              <select
                id="empresa-estado"
                name="estado"
                className={`form-select ${errors.estado ? 'input-error' : ''}`}
                value={formData.estado}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {VALID_ESTADOS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              {errors.estado && <span className="field-error">{errors.estado}</span>}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-inline"></span>
                  {isEditMode ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Empresa'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

