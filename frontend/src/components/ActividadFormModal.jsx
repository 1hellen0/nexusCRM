import React, { useState, useEffect } from 'react';

const VALID_TIPOS = ['Llamada', 'Reunion', 'Correo', 'Otro'];
const VALID_ESTADOS = ['Pendiente', 'Completada', 'Cancelada'];

function formatToDatetimeLocal(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function ActividadFormModal({
  isOpen,
  onClose,
  onSave,
  actividadToEdit,
  isSubmitting,
  oportunidades = [],
  onNavigateToOportunidades
}) {
  const isEditMode = Boolean(actividadToEdit && actividadToEdit.id_actividad);

  const [formData, setFormData] = useState({
    id_oportunidad: '',
    tipo: 'Llamada',
    descripcion: '',
    fecha_actividad: '',
    estado: 'Pendiente'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        id_oportunidad: actividadToEdit.id_oportunidad ? String(actividadToEdit.id_oportunidad) : '',
        tipo: actividadToEdit.tipo || 'Llamada',
        descripcion: actividadToEdit.descripcion || '',
        fecha_actividad: formatToDatetimeLocal(actividadToEdit.fecha_actividad),
        estado: actividadToEdit.estado || 'Pendiente'
      });
    } else {
      // Valor por defecto para fecha y hora: momento actual en formato YYYY-MM-DDTHH:mm
      const now = new Date();
      // Redondear a los siguientes 15 o 30 minutos o usar hora actual
      const defaultDateTime = formatToDatetimeLocal(now);
      const defaultOpId = oportunidades.length > 0 ? String(oportunidades[0].id_oportunidad) : '';

      setFormData({
        id_oportunidad: defaultOpId,
        tipo: 'Llamada',
        descripcion: '',
        fecha_actividad: defaultDateTime,
        estado: 'Pendiente'
      });
    }
    setErrors({});
  }, [actividadToEdit, isEditMode, isOpen, oportunidades]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const desc = formData.descripcion.trim();
    const fecha = formData.fecha_actividad.trim();

    if (!formData.id_oportunidad) {
      errs.id_oportunidad = 'Debe seleccionar una oportunidad comercial.';
    }

    if (!VALID_TIPOS.includes(formData.tipo)) {
      errs.tipo = 'Seleccione un tipo de actividad válido.';
    }

    if (!desc) {
      errs.descripcion = 'La descripción de la actividad es obligatoria.';
    }

    if (!fecha) {
      errs.fecha_actividad = 'La fecha y hora de la actividad son obligatorias.';
    } else {
      const parsed = Date.parse(fecha);
      if (isNaN(parsed)) {
        errs.fecha_actividad = 'Fecha y hora no válidas.';
      }
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

    // Convertir a formato Date estándar asegurando compatibilidad con MySQL DATETIME
    const dateObj = new Date(formData.fecha_actividad);

    const payload = {
      id_oportunidad: parseInt(formData.id_oportunidad, 10),
      tipo: formData.tipo,
      descripcion: formData.descripcion.trim(),
      fecha_actividad: dateObj.toISOString(),
      estado: formData.estado
    };

    onSave(payload);
  };

  const hasNoOportunidades = oportunidades.length === 0;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="actividad-modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h3 id="actividad-modal-title" className="modal-title">
              {isEditMode ? 'Editar Actividad de Seguimiento' : 'Nueva Actividad de Seguimiento'}
            </h3>
            <p className="modal-subtitle">
              {isEditMode
                ? `Actualizando datos de la actividad ID #${actividadToEdit.id_actividad}`
                : 'Registre una interacción, llamada, reunión o correo del pipeline comercial'}
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
            {/* Si no hay oportunidades registradas */}
            {hasNoOportunidades && (
              <div className="alert alert-danger" role="alert">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <strong>No existen oportunidades registradas:</strong> Las actividades deben estar vinculadas a una Oportunidad Comercial activa.
                  {onNavigateToOportunidades && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { onClose(); onNavigateToOportunidades(); }}
                      >
                        Ir al Módulo de Oportunidades &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadatos en edición */}
            {isEditMode && (
              <div className="read-only-meta">
                <div className="meta-badge">
                  <span className="meta-label">ID Actividad:</span>
                  <span className="meta-val">#{actividadToEdit.id_actividad}</span>
                </div>
              </div>
            )}

            {/* Selector de Oportunidad Comercial */}
            <div className="form-group">
              <label htmlFor="act-id_oportunidad" className="form-label">
                Oportunidad Comercial Vinculada <span className="text-danger">*</span>
              </label>
              <select
                id="act-id_oportunidad"
                name="id_oportunidad"
                className={`form-select ${errors.id_oportunidad ? 'input-error' : ''}`}
                value={formData.id_oportunidad}
                onChange={handleChange}
                disabled={isSubmitting || hasNoOportunidades}
              >
                <option value="">-- Seleccionar oportunidad comercial --</option>
                {oportunidades.map(op => (
                  <option key={op.id_oportunidad} value={op.id_oportunidad}>
                    #{op.id_oportunidad} - {op.titulo} ({op.empresa?.nombre || `Empresa #${op.id_empresa}`})
                  </option>
                ))}
              </select>
              {errors.id_oportunidad && (
                <span className="field-error">{errors.id_oportunidad}</span>
              )}
            </div>

            {/* Tipo y Estado en fila */}
            <div className="form-row">
              <div className="form-group col-half">
                <label htmlFor="act-tipo" className="form-label">
                  Tipo de Actividad <span className="text-danger">*</span>
                </label>
                <select
                  id="act-tipo"
                  name="tipo"
                  className={`form-select ${errors.tipo ? 'input-error' : ''}`}
                  value={formData.tipo}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {VALID_TIPOS.map(tp => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
                {errors.tipo && <span className="field-error">{errors.tipo}</span>}
              </div>

              <div className="form-group col-half">
                <label htmlFor="act-estado" className="form-label">
                  Estado <span className="text-danger">*</span>
                </label>
                <select
                  id="act-estado"
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

            {/* Fecha y Hora (DATETIME) */}
            <div className="form-group">
              <label htmlFor="act-fecha_actividad" className="form-label">
                Fecha y Hora de la Actividad <span className="text-danger">*</span>
              </label>
              <input
                id="act-fecha_actividad"
                name="fecha_actividad"
                type="datetime-local"
                className={`form-input ${errors.fecha_actividad ? 'input-error' : ''}`}
                value={formData.fecha_actividad}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
              {errors.fecha_actividad && (
                <span className="field-error">{errors.fecha_actividad}</span>
              )}
              <span className="form-help-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Se almacenará como fecha y hora precisa compatible con MySQL DATETIME.
              </span>
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label htmlFor="act-descripcion" className="form-label">
                Descripción / Minuta del Seguimiento <span className="text-danger">*</span>
              </label>
              <textarea
                id="act-descripcion"
                name="descripcion"
                rows={3}
                className={`form-input ${errors.descripcion ? 'input-error' : ''}`}
                placeholder="Detalle los puntos tratados, acuerdos alcanzados o próximos pasos..."
                value={formData.descripcion}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{ resize: 'vertical' }}
              />
              {errors.descripcion && (
                <span className="field-error">{errors.descripcion}</span>
              )}
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
              disabled={isSubmitting || hasNoOportunidades}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-inline"></span>
                  {isEditMode ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Actividad'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

