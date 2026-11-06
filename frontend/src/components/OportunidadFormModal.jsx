import React, { useState, useEffect } from 'react';

const VALID_ETAPAS = ['Nueva', 'Contactada', 'Propuesta', 'Negociacion', 'Ganada', 'Perdida'];

function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export default function OportunidadFormModal({
  isOpen,
  onClose,
  onSave,
  oportunidadToEdit,
  isSubmitting,
  empresas = [],
  contactos = [],
  onNavigateToEmpresas,
  onNavigateToContactos
}) {
  const isEditMode = Boolean(oportunidadToEdit && oportunidadToEdit.id_oportunidad);

  const [formData, setFormData] = useState({
    id_empresa: '',
    id_contacto: '',
    titulo: '',
    descripcion: '',
    valor_estimado: '',
    etapa: 'Nueva',
    fecha_cierre_estimada: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        id_empresa: oportunidadToEdit.id_empresa ? String(oportunidadToEdit.id_empresa) : '',
        id_contacto: oportunidadToEdit.id_contacto ? String(oportunidadToEdit.id_contacto) : '',
        titulo: oportunidadToEdit.titulo || '',
        descripcion: oportunidadToEdit.descripcion || '',
        valor_estimado: oportunidadToEdit.valor_estimado !== undefined ? String(oportunidadToEdit.valor_estimado) : '',
        etapa: oportunidadToEdit.etapa || 'Nueva',
        fecha_cierre_estimada: oportunidadToEdit.fecha_cierre_estimada || ''
      });
    } else {
      // Modo creación: si hay empresas disponibles, seleccionar la primera por defecto
      const defaultEmpresaId = empresas.length > 0 ? String(empresas[0].id_empresa) : '';
      // Filtrar contactos de esa empresa por defecto
      const defaultContactos = contactos.filter(c => String(c.id_empresa) === defaultEmpresaId);
      const defaultContactoId = defaultContactos.length > 0 ? String(defaultContactos[0].id_contacto) : '';

      setFormData({
        id_empresa: defaultEmpresaId,
        id_contacto: defaultContactoId,
        titulo: '',
        descripcion: '',
        valor_estimado: '',
        etapa: 'Nueva',
        fecha_cierre_estimada: ''
      });
    }
    setErrors({});
  }, [oportunidadToEdit, isEditMode, isOpen, empresas, contactos]);

  if (!isOpen) return null;

  // Contactos pertenecientes a la empresa seleccionada
  const filteredContactos = contactos.filter(
    c => String(c.id_empresa) === String(formData.id_empresa)
  );

  const handleEmpresaChange = (e) => {
    const newEmpresaId = e.target.value;
    // Si cambia de empresa, verificamos si el contacto actual sigue perteneciendo
    const contactosDeNuevaEmpresa = contactos.filter(c => String(c.id_empresa) === String(newEmpresaId));
    const contactoValido = contactosDeNuevaEmpresa.some(c => String(c.id_contacto) === String(formData.id_contacto));

    setFormData(prev => ({
      ...prev,
      id_empresa: newEmpresaId,
      id_contacto: contactoValido ? prev.id_contacto : (contactosDeNuevaEmpresa.length > 0 ? String(contactosDeNuevaEmpresa[0].id_contacto) : '')
    }));

    if (errors.id_empresa) setErrors(prev => ({ ...prev, id_empresa: null }));
    if (errors.id_contacto) setErrors(prev => ({ ...prev, id_contacto: null }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    const titulo = formData.titulo.trim();
    const valorStr = String(formData.valor_estimado).trim();
    const fecha = formData.fecha_cierre_estimada.trim();

    if (!formData.id_empresa) {
      errs.id_empresa = 'Debe seleccionar una empresa cliente.';
    }

    if (!formData.id_contacto) {
      errs.id_contacto = 'Debe seleccionar un contacto principal perteneciente a la empresa.';
    } else {
      // Doble verificación: comprobar que el contacto efectivamente pertenece a la empresa
      const contactoObj = contactos.find(c => String(c.id_contacto) === String(formData.id_contacto));
      if (!contactoObj || String(contactoObj.id_empresa) !== String(formData.id_empresa)) {
        errs.id_contacto = 'El contacto seleccionado no pertenece a la empresa indicada.';
      }
    }

    if (!titulo) {
      errs.titulo = 'El título de la oportunidad es obligatorio.';
    } else if (titulo.length > 150) {
      errs.titulo = 'El título no puede superar los 150 caracteres.';
    }

    if (valorStr === '') {
      errs.valor_estimado = 'El valor estimado es obligatorio.';
    } else {
      const num = Number(valorStr);
      if (isNaN(num) || !isFinite(num)) {
        errs.valor_estimado = 'El valor estimado debe ser un número válido.';
      } else if (num < 0) {
        errs.valor_estimado = 'El valor estimado no puede ser negativo.';
      } else if (num > 9999999999.99) {
        errs.valor_estimado = 'El valor estimado excede el límite permitido para DECIMAL(12,2).';
      } else {
        // Verificar máximo 2 decimales
        const parts = valorStr.split('.');
        if (parts.length > 1 && parts[1].length > 2) {
          errs.valor_estimado = 'El valor estimado no puede tener más de 2 decimales.';
        }
      }
    }

    if (!VALID_ETAPAS.includes(formData.etapa)) {
      errs.etapa = 'Seleccione una etapa válida.';
    }

    if (fecha) {
      if (!isValidDateString(fecha)) {
        errs.fecha_cierre_estimada = 'La fecha de cierre debe ser una fecha válida en formato AAAA-MM-DD.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      id_empresa: parseInt(formData.id_empresa, 10),
      id_contacto: parseInt(formData.id_contacto, 10),
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim() ? formData.descripcion.trim() : null,
      valor_estimado: parseFloat(Number(formData.valor_estimado).toFixed(2)),
      etapa: formData.etapa,
      fecha_cierre_estimada: formData.fecha_cierre_estimada.trim() ? formData.fecha_cierre_estimada.trim() : null
    };

    onSave(payload);
  };

  const hasNoEmpresas = empresas.length === 0;
  const hasNoContactosForSelected = Boolean(formData.id_empresa && filteredContactos.length === 0);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="oportunidad-modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h3 id="oportunidad-modal-title" className="modal-title">
              {isEditMode ? 'Editar Oportunidad Comercial' : 'Nueva Oportunidad Comercial'}
            </h3>
            <p className="modal-subtitle">
              {isEditMode
                ? `Actualizando datos de la oportunidad ID #${oportunidadToEdit.id_oportunidad}`
                : 'Defina un nuevo negocio en el pipeline comercial B2B'}
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
            {/* Si no hay empresas registradas */}
            {hasNoEmpresas && (
              <div className="alert alert-danger" role="alert">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <strong>No existen empresas registradas:</strong> Debe registrar primero una Empresa Cliente y sus contactos antes de crear una oportunidad.
                  {onNavigateToEmpresas && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { onClose(); onNavigateToEmpresas(); }}
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
                  <span className="meta-label">ID Oportunidad:</span>
                  <span className="meta-val">#{oportunidadToEdit.id_oportunidad}</span>
                </div>
                {oportunidadToEdit.fecha_creacion && (
                  <div className="meta-badge">
                    <span className="meta-label">Fecha Creación:</span>
                    <span className="meta-val">
                      {new Date(oportunidadToEdit.fecha_creacion).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Fila de Empresa y Contacto (Relación Compuesta) */}
            <div className="form-row">
              <div className="form-group col-half">
                <label htmlFor="op-id_empresa" className="form-label">
                  Empresa Cliente <span className="text-danger">*</span>
                </label>
                <select
                  id="op-id_empresa"
                  name="id_empresa"
                  className={`form-select ${errors.id_empresa ? 'input-error' : ''}`}
                  value={formData.id_empresa}
                  onChange={handleEmpresaChange}
                  disabled={isSubmitting || hasNoEmpresas}
                >
                  <option value="">-- Seleccionar empresa --</option>
                  {empresas.map(emp => (
                    <option key={emp.id_empresa} value={emp.id_empresa}>
                      #{emp.id_empresa} - {emp.nombre}
                    </option>
                  ))}
                </select>
                {errors.id_empresa && <span className="field-error">{errors.id_empresa}</span>}
              </div>

              <div className="form-group col-half">
                <label htmlFor="op-id_contacto" className="form-label">
                  Contacto Principal <span className="text-danger">*</span>
                </label>
                <select
                  id="op-id_contacto"
                  name="id_contacto"
                  className={`form-select ${errors.id_contacto ? 'input-error' : ''}`}
                  value={formData.id_contacto}
                  onChange={handleChange}
                  disabled={isSubmitting || !formData.id_empresa || filteredContactos.length === 0}
                >
                  <option value="">
                    {filteredContactos.length === 0
                      ? (formData.id_empresa ? '-- Sin contactos en esta empresa --' : '-- Seleccione empresa primero --')
                      : '-- Seleccionar contacto --'}
                  </option>
                  {filteredContactos.map(con => (
                    <option key={con.id_contacto} value={con.id_contacto}>
                      {con.nombre} {con.cargo ? `(${con.cargo})` : ''}
                    </option>
                  ))}
                </select>
                {errors.id_contacto && <span className="field-error">{errors.id_contacto}</span>}
              </div>
            </div>

            {/* Aviso si la empresa no tiene contactos */}
            {hasNoContactosForSelected && (
              <div className="alert alert-danger" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', padding: '0.6rem 0.85rem' }}>
                <span className="alert-icon">ℹ️</span>
                <div className="alert-content" style={{ fontSize: '0.82rem' }}>
                  Esta empresa no tiene contactos registrados. La clave foránea compuesta requiere un contacto válido de la misma empresa.
                  {onNavigateToContactos && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginLeft: '0.5rem', padding: '0.15rem 0.5rem' }}
                      onClick={() => { onClose(); onNavigateToContactos(); }}
                    >
                      + Registrar Contacto
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Título de la oportunidad */}
            <div className="form-group">
              <label htmlFor="op-titulo" className="form-label">
                Título de la Oportunidad <span className="text-danger">*</span>
              </label>
              <input
                id="op-titulo"
                name="titulo"
                type="text"
                className={`form-input ${errors.titulo ? 'input-error' : ''}`}
                placeholder="Ej. Modernización de Servidores y Cloud B2B"
                value={formData.titulo}
                onChange={handleChange}
                maxLength={150}
                disabled={isSubmitting}
                autoFocus={!hasNoEmpresas}
              />
              {errors.titulo && <span className="field-error">{errors.titulo}</span>}
              <div className="field-counter">{formData.titulo.length}/150</div>
            </div>

            {/* Valor estimado y Etapa */}
            <div className="form-row">
              <div className="form-group col-half">
                <label htmlFor="op-valor_estimado" className="form-label">
                  Valor Estimado (MXN / USD) <span className="text-danger">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="op-valor_estimado"
                    name="valor_estimado"
                    type="number"
                    step="0.01"
                    min="0"
                    max="9999999999.99"
                    className={`form-input ${errors.valor_estimado ? 'input-error' : ''}`}
                    placeholder="0.00"
                    value={formData.valor_estimado}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.valor_estimado && <span className="field-error">{errors.valor_estimado}</span>}
              </div>

              <div className="form-group col-half">
                <label htmlFor="op-etapa" className="form-label">
                  Etapa Comercial <span className="text-danger">*</span>
                </label>
                <select
                  id="op-etapa"
                  name="etapa"
                  className={`form-select ${errors.etapa ? 'input-error' : ''}`}
                  value={formData.etapa}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {VALID_ETAPAS.map(et => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
                {errors.etapa && <span className="field-error">{errors.etapa}</span>}
              </div>
            </div>

            {/* Fecha de cierre estimada */}
            <div className="form-group">
              <label htmlFor="op-fecha_cierre_estimada" className="form-label">
                Fecha Estimada de Cierre (Opcional)
              </label>
              <input
                id="op-fecha_cierre_estimada"
                name="fecha_cierre_estimada"
                type="date"
                className={`form-input ${errors.fecha_cierre_estimada ? 'input-error' : ''}`}
                value={formData.fecha_cierre_estimada}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.fecha_cierre_estimada && (
                <span className="field-error">{errors.fecha_cierre_estimada}</span>
              )}
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label htmlFor="op-descripcion" className="form-label">
                Descripción / Alcance Comercial
              </label>
              <textarea
                id="op-descripcion"
                name="descripcion"
                rows={3}
                className="form-input"
                placeholder="Detalles sobre el requerimiento del cliente, requerimientos técnicos, términos de propuesta..."
                value={formData.descripcion}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{ resize: 'vertical' }}
              />
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
              disabled={isSubmitting || hasNoEmpresas || hasNoContactosForSelected}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-inline"></span>
                  {isEditMode ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? 'Guardar Cambios' : 'Crear Oportunidad'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

