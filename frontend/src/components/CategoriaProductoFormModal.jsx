import React, { useEffect, useState } from 'react';

export default function CategoriaProductoFormModal({ isOpen, onClose, onSave, categoriaToEdit, isSubmitting }) {
  const isEditMode = Boolean(categoriaToEdit && categoriaToEdit.id_categoria);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', activo: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      nombre: categoriaToEdit?.nombre || '',
      descripcion: categoriaToEdit?.descripcion || '',
      activo: categoriaToEdit?.activo !== false
    });
    setErrors({});
  }, [categoriaToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors = {};
    const nombre = formData.nombre.trim();
    const descripcion = formData.descripcion.trim();
    if (!nombre) nextErrors.nombre = 'El nombre de la categoría es obligatorio.';
    else if (nombre.length > 80) nextErrors.nombre = 'El nombre no puede superar los 80 caracteres.';
    if (descripcion.length > 255) nextErrors.descripcion = 'La descripción no puede superar los 255 caracteres.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = ({ target }) => {
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
    if (errors[target.name]) setErrors(prev => ({ ...prev, [target.name]: null }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!validate()) return;
    onSave({ nombre: formData.nombre.trim(), descripcion: formData.descripcion.trim() || null, activo: formData.activo });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="categoria-modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div><h3 id="categoria-modal-title" className="modal-title">{isEditMode ? 'Editar Categoría' : 'Nueva Categoría'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando categoría #${categoriaToEdit.id_categoria}` : 'Complete los datos de la categoría de producto'}</p></div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className={`form-group ${errors.nombre ? 'has-error' : ''}`}><label className="form-label" htmlFor="categoria-nombre">Nombre <span className="required">*</span></label><input id="categoria-nombre" name="nombre" type="text" className="form-control" maxLength={80} value={formData.nombre} onChange={handleChange} disabled={isSubmitting} placeholder="Ej. Software empresarial" autoFocus />{errors.nombre && <p className="field-error">{errors.nombre}</p>}</div>
            <div className={`form-group ${errors.descripcion ? 'has-error' : ''}`}><label className="form-label" htmlFor="categoria-descripcion">Descripción</label><textarea id="categoria-descripcion" name="descripcion" className="form-control" rows={3} maxLength={255} value={formData.descripcion} onChange={handleChange} disabled={isSubmitting} placeholder="Descripción opcional de la categoría..." />{errors.descripcion && <p className="field-error">{errors.descripcion}</p>}</div>
            <div className="form-group form-check-group"><label className="form-check-label"><input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} /><span>Categoría activa</span></label></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Categoría' : 'Registrar Categoría'}</button></div>
        </form>
      </div>
    </div>
  );
}
