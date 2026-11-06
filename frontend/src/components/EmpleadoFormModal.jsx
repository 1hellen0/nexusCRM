import React, { useEffect, useState } from 'react';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function EmpleadoFormModal({ isOpen, onClose, onSave, empleadoToEdit, departamentos, isSubmitting }) {
  const isEditMode = Boolean(empleadoToEdit && empleadoToEdit.id_empleado);
  const [formData, setFormData] = useState({
    id_departamento: '', id_usuario: '', nombre: '', apellido: '', correo: '', telefono: '', cargo: '', activo: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      id_departamento: empleadoToEdit?.id_departamento ? String(empleadoToEdit.id_departamento) : '',
      id_usuario: empleadoToEdit?.id_usuario ? String(empleadoToEdit.id_usuario) : '',
      nombre: empleadoToEdit?.nombre || '',
      apellido: empleadoToEdit?.apellido || '',
      correo: empleadoToEdit?.correo || '',
      telefono: empleadoToEdit?.telefono || '',
      cargo: empleadoToEdit?.cargo || '',
      activo: empleadoToEdit?.activo !== false
    });
    setErrors({});
  }, [empleadoToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors = {};
    const idUsuario = formData.id_usuario.trim();
    const correo = formData.correo.trim();
    if (!formData.id_departamento) nextErrors.id_departamento = 'Seleccione un departamento.';
    if (idUsuario && (!/^[1-9]\d*$/.test(idUsuario) || !Number.isSafeInteger(Number(idUsuario)))) nextErrors.id_usuario = 'El ID de usuario debe ser un entero positivo.';
    if (!formData.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.';
    else if (formData.nombre.trim().length > 80) nextErrors.nombre = 'El nombre no puede superar los 80 caracteres.';
    if (!formData.apellido.trim()) nextErrors.apellido = 'El apellido es obligatorio.';
    else if (formData.apellido.trim().length > 80) nextErrors.apellido = 'El apellido no puede superar los 80 caracteres.';
    if (!correo) nextErrors.correo = 'El correo electrónico es obligatorio.';
    else if (!EMAIL_REGEX.test(correo)) nextErrors.correo = 'Ingrese un correo electrónico válido.';
    else if (correo.length > 150) nextErrors.correo = 'El correo no puede superar los 150 caracteres.';
    if (formData.telefono.trim().length > 20) nextErrors.telefono = 'El teléfono no puede superar los 20 caracteres.';
    if (!formData.cargo.trim()) nextErrors.cargo = 'El cargo es obligatorio.';
    else if (formData.cargo.trim().length > 100) nextErrors.cargo = 'El cargo no puede superar los 100 caracteres.';
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
    onSave({
      id_departamento: Number(formData.id_departamento),
      id_usuario: formData.id_usuario.trim() ? Number(formData.id_usuario.trim()) : null,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      correo: formData.correo.trim().toLowerCase(),
      telefono: formData.telefono.trim() || null,
      cargo: formData.cargo.trim(),
      activo: formData.activo
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="empleado-modal-title">
      <div className="modal-dialog">
        <div className="modal-header">
          <div><h3 id="empleado-modal-title" className="modal-title">{isEditMode ? 'Editar Empleado' : 'Nuevo Empleado'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando empleado #${empleadoToEdit.id_empleado}` : 'Complete los datos del empleado'}</p></div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className={`form-group ${errors.id_departamento ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-departamento">Departamento <span className="required">*</span></label><select id="empleado-departamento" name="id_departamento" className="form-select" value={formData.id_departamento} onChange={handleChange} disabled={isSubmitting || departamentos.length === 0}><option value="">Seleccione un departamento</option>{departamentos.map(departamento => <option key={departamento.id_departamento} value={departamento.id_departamento}>{departamento.codigo} — {departamento.nombre}</option>)}</select>{departamentos.length === 0 && <p className="field-error">No hay departamentos disponibles.</p>}{errors.id_departamento && <p className="field-error">{errors.id_departamento}</p>}</div>
            <div className={`form-group ${errors.id_usuario ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-usuario">ID de usuario <span className="text-muted-cell">(opcional)</span></label><input id="empleado-usuario" name="id_usuario" type="number" min="1" step="1" className="form-control" value={formData.id_usuario} onChange={handleChange} disabled={isSubmitting} placeholder="ID existente de usuario" />{errors.id_usuario && <p className="field-error">{errors.id_usuario}</p>}<small className="form-help">No se crean cuentas automáticamente.</small></div>
            <div className="form-row"><div className={`form-group col-half ${errors.nombre ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-nombre">Nombre <span className="required">*</span></label><input id="empleado-nombre" name="nombre" type="text" className="form-control" maxLength={80} value={formData.nombre} onChange={handleChange} disabled={isSubmitting} autoFocus />{errors.nombre && <p className="field-error">{errors.nombre}</p>}</div><div className={`form-group col-half ${errors.apellido ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-apellido">Apellido <span className="required">*</span></label><input id="empleado-apellido" name="apellido" type="text" className="form-control" maxLength={80} value={formData.apellido} onChange={handleChange} disabled={isSubmitting} />{errors.apellido && <p className="field-error">{errors.apellido}</p>}</div></div>
            <div className={`form-group ${errors.correo ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-correo">Correo electrónico <span className="required">*</span></label><input id="empleado-correo" name="correo" type="email" className="form-control" maxLength={150} value={formData.correo} onChange={handleChange} disabled={isSubmitting} />{errors.correo && <p className="field-error">{errors.correo}</p>}</div>
            <div className="form-row"><div className={`form-group col-half ${errors.telefono ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-telefono">Teléfono</label><input id="empleado-telefono" name="telefono" type="text" className="form-control" maxLength={20} value={formData.telefono} onChange={handleChange} disabled={isSubmitting} />{errors.telefono && <p className="field-error">{errors.telefono}</p>}</div><div className={`form-group col-half ${errors.cargo ? 'has-error' : ''}`}><label className="form-label" htmlFor="empleado-cargo">Cargo <span className="required">*</span></label><input id="empleado-cargo" name="cargo" type="text" className="form-control" maxLength={100} value={formData.cargo} onChange={handleChange} disabled={isSubmitting} />{errors.cargo && <p className="field-error">{errors.cargo}</p>}</div></div>
            <div className="form-group form-check-group"><label className="form-check-label"><input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} /><span>Empleado activo</span></label></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Empleado' : 'Registrar Empleado'}</button></div>
        </form>
      </div>
    </div>
  );
}
