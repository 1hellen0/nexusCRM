import React, { useEffect, useState } from 'react';

export default function DepartamentoFormModal({ isOpen, onClose, onSave, departamentoToEdit, isSubmitting }) {
  const isEditMode = Boolean(departamentoToEdit?.id_departamento);
  const [formData, setFormData] = useState({ codigo: '', nombre: '', activo: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({ codigo: departamentoToEdit?.codigo || '', nombre: departamentoToEdit?.nombre || '', activo: departamentoToEdit?.activo !== undefined ? Boolean(departamentoToEdit.activo) : true });
    setErrors({});
  }, [departamentoToEdit, isOpen]);

  if (!isOpen) return null;
  const validate = () => { const next = {}; const codigo = formData.codigo.trim(); const nombre = formData.nombre.trim(); if (!codigo) next.codigo = 'El código del departamento es obligatorio.'; else if (codigo.length > 20) next.codigo = 'El código no puede superar 20 caracteres.'; if (!nombre) next.nombre = 'El nombre del departamento es obligatorio.'; else if (nombre.length > 80) next.nombre = 'El nombre no puede superar 80 caracteres.'; setErrors(next); return Object.keys(next).length === 0; };
  const handleChange = ({ target }) => { const value = target.type === 'checkbox' ? target.checked : target.value; setFormData(prev => ({ ...prev, [target.name]: value })); if (errors[target.name]) setErrors(prev => ({ ...prev, [target.name]: null })); };
  const handleSubmit = event => { event.preventDefault(); if (!validate()) return; onSave({ codigo: formData.codigo.trim(), nombre: formData.nombre.trim(), activo: Boolean(formData.activo) }); };
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="departamento-modal-title"><div className="modal-dialog"><div className="modal-header"><div><h3 id="departamento-modal-title" className="modal-title">{isEditMode ? 'Editar Departamento' : 'Nuevo Departamento'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando departamento #${departamentoToEdit.id_departamento}` : 'Complete los datos del departamento'}</p></div><button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button></div><form onSubmit={handleSubmit} noValidate><div className="modal-body">
    <div className={`form-group ${errors.codigo ? 'has-error' : ''}`}><label className="form-label" htmlFor="departamento-codigo">Código <span className="required">*</span></label><input id="departamento-codigo" name="codigo" type="text" className="form-control" maxLength={20} value={formData.codigo} onChange={handleChange} disabled={isSubmitting} autoFocus />{errors.codigo && <p className="field-error">{errors.codigo}</p>}</div>
    <div className={`form-group ${errors.nombre ? 'has-error' : ''}`}><label className="form-label" htmlFor="departamento-nombre">Nombre <span className="required">*</span></label><input id="departamento-nombre" name="nombre" type="text" className="form-control" maxLength={80} value={formData.nombre} onChange={handleChange} disabled={isSubmitting} />{errors.nombre && <p className="field-error">{errors.nombre}</p>}</div>
    <div className="form-group form-check-group"><label className="form-check-label"><input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} /><span>Departamento activo</span></label></div>
  </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Departamento' : 'Registrar Departamento'}</button></div></form></div></div>;
}
