import React, { useState, useEffect } from 'react';

export default function SectorFormModal({ isOpen, onClose, onSave, sectorToEdit, isSubmitting }) {
  const isEditMode = Boolean(sectorToEdit && sectorToEdit.id_sector);

  const [formData, setFormData] = useState({ nombre: '', descripcion: '', activo: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        nombre: sectorToEdit.nombre || '',
        descripcion: sectorToEdit.descripcion || '',
        activo: sectorToEdit.activo !== false
      });
    } else {
      setFormData({ nombre: '', descripcion: '', activo: true });
    }
    setErrors({});
  }, [sectorToEdit, isEditMode, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const nombre = formData.nombre.trim();
    if (!nombre) errs.nombre = 'El nombre del sector es obligatorio.';
    else if (nombre.length > 80) errs.nombre = 'El nombre no puede superar 80 caracteres.';
    if (formData.descripcion && formData.descripcion.trim().length > 255)
      errs.descripcion = 'La descripción no puede superar 500 caracteres.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      nombre: formData.nombre.trim(),
      ...(formData.descripcion.trim() ? { descripcion: formData.descripcion.trim() } : {}),
      activo: formData.activo
    };
    onSave(payload);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{isEditMode ? 'Editar Sector' : 'Nuevo Sector Empresarial'}</h3>
            <p className="modal-subtitle">{isEditMode ? `Modificando sector #${sectorToEdit.id_sector}` : 'Complete los datos del sector industrial'}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className={`form-group ${errors.nombre ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="sec-nombre">Nombre del Sector <span className="required">*</span></label>
              <input id="sec-nombre" name="nombre" type="text" className="form-control" maxLength={80}
                value={formData.nombre} onChange={handleChange} disabled={isSubmitting}
                placeholder="ej. Tecnología, Manufactura, Salud..." autoFocus />
              {errors.nombre && <p className="field-error">{errors.nombre}</p>}
            </div>
            <div className={`form-group ${errors.descripcion ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="sec-desc">Descripción</label>
              <textarea id="sec-desc" name="descripcion" className="form-control" rows={3} maxLength={255}
                value={formData.descripcion} onChange={handleChange} disabled={isSubmitting}
                placeholder="Descripción opcional del sector..." />
              {errors.descripcion && <p className="field-error">{errors.descripcion}</p>}
            </div>
            <div className="form-group form-check-group">
              <label className="form-check-label">
                <input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} />
                <span>Sector activo</span>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Sector' : 'Registrar Sector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

