import React, { useEffect, useState } from 'react';

const TIPOS = ['Email', 'Webinar', 'Feria', 'Digital', 'Directa'];
const ESTADOS = ['Planificada', 'Activa', 'Finalizada', 'Cancelada'];
const PRESUPUESTO_REGEX = /^\d+(\.\d{1,2})?$/;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function CampanaMarketingFormModal({ isOpen, onClose, onSave, campanaToEdit, empleados, isSubmitting }) {
  const isEditMode = Boolean(campanaToEdit && campanaToEdit.id_campana);
  const [formData, setFormData] = useState({ id_empleado_responsable: '', nombre: '', tipo: 'Email', fecha_inicio: '', fecha_fin: '', presupuesto: '0.00', estado: 'Planificada' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      id_empleado_responsable: campanaToEdit?.id_empleado_responsable ? String(campanaToEdit.id_empleado_responsable) : '',
      nombre: campanaToEdit?.nombre || '',
      tipo: campanaToEdit?.tipo || 'Email',
      fecha_inicio: campanaToEdit?.fecha_inicio || '',
      fecha_fin: campanaToEdit?.fecha_fin || '',
      presupuesto: campanaToEdit?.presupuesto !== undefined && campanaToEdit?.presupuesto !== null ? String(campanaToEdit.presupuesto) : '0.00',
      estado: campanaToEdit?.estado || 'Planificada'
    });
    setErrors({});
  }, [campanaToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors = {};
    const nombre = formData.nombre.trim();
    const presupuesto = formData.presupuesto.trim();
    if (!formData.id_empleado_responsable) nextErrors.id_empleado_responsable = 'Seleccione un empleado responsable.';
    if (!nombre) nextErrors.nombre = 'El nombre de la campaña es obligatorio.';
    else if (nombre.length > 120) nextErrors.nombre = 'El nombre no puede superar los 120 caracteres.';
    if (!TIPOS.includes(formData.tipo)) nextErrors.tipo = 'Seleccione un tipo válido.';
    if (!formData.fecha_inicio) nextErrors.fecha_inicio = 'La fecha de inicio es obligatoria.';
    else if (!isValidDate(formData.fecha_inicio)) nextErrors.fecha_inicio = 'Ingrese una fecha de inicio válida.';
    if (formData.fecha_fin && !isValidDate(formData.fecha_fin)) nextErrors.fecha_fin = 'Ingrese una fecha de fin válida.';
    if (formData.fecha_inicio && formData.fecha_fin && isValidDate(formData.fecha_inicio) && isValidDate(formData.fecha_fin) && formData.fecha_fin < formData.fecha_inicio) nextErrors.fecha_fin = 'La fecha de fin debe ser igual o posterior a la fecha de inicio.';
    if (!presupuesto) nextErrors.presupuesto = 'El presupuesto es obligatorio.';
    else if (!PRESUPUESTO_REGEX.test(presupuesto) || presupuesto.split('.')[0].length > 10) nextErrors.presupuesto = 'Use un valor mayor o igual a 0 con máximo dos decimales.';
    if (!ESTADOS.includes(formData.estado)) nextErrors.estado = 'Seleccione un estado válido.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = ({ target }) => {
    setFormData(prev => ({ ...prev, [target.name]: target.value }));
    if (errors[target.name]) setErrors(prev => ({ ...prev, [target.name]: null }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!validate()) return;
    onSave({ id_empleado_responsable: Number(formData.id_empleado_responsable), nombre: formData.nombre.trim(), tipo: formData.tipo, fecha_inicio: formData.fecha_inicio, fecha_fin: formData.fecha_fin || null, presupuesto: formData.presupuesto.trim(), estado: formData.estado });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="campana-modal-title">
      <div className="modal-dialog">
        <div className="modal-header"><div><h3 id="campana-modal-title" className="modal-title">{isEditMode ? 'Editar Campaña' : 'Nueva Campaña'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando campaña #${campanaToEdit.id_campana}` : 'Complete los datos de la campaña de marketing'}</p></div><button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button></div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className={`form-group ${errors.id_empleado_responsable ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-responsable">Empleado responsable <span className="required">*</span></label><select id="campana-responsable" name="id_empleado_responsable" className="form-select" value={formData.id_empleado_responsable} onChange={handleChange} disabled={isSubmitting || empleados.length === 0}><option value="">Seleccione un empleado</option>{empleados.map(empleado => <option key={empleado.id_empleado} value={empleado.id_empleado}>{empleado.nombre} {empleado.apellido}</option>)}</select>{empleados.length === 0 && <p className="field-error">No hay empleados disponibles.</p>}{errors.id_empleado_responsable && <p className="field-error">{errors.id_empleado_responsable}</p>}</div>
            <div className={`form-group ${errors.nombre ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-nombre">Nombre <span className="required">*</span></label><input id="campana-nombre" name="nombre" type="text" className="form-control" maxLength={120} value={formData.nombre} onChange={handleChange} disabled={isSubmitting} autoFocus />{errors.nombre && <p className="field-error">{errors.nombre}</p>}</div>
            <div className="form-row"><div className={`form-group col-half ${errors.tipo ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-tipo">Tipo <span className="required">*</span></label><select id="campana-tipo" name="tipo" className="form-select" value={formData.tipo} onChange={handleChange} disabled={isSubmitting}>{TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}</select>{errors.tipo && <p className="field-error">{errors.tipo}</p>}</div><div className={`form-group col-half ${errors.estado ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-estado">Estado <span className="required">*</span></label><select id="campana-estado" name="estado" className="form-select" value={formData.estado} onChange={handleChange} disabled={isSubmitting}>{ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}</select>{errors.estado && <p className="field-error">{errors.estado}</p>}</div></div>
            <div className="form-row"><div className={`form-group col-half ${errors.fecha_inicio ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-inicio">Fecha de inicio <span className="required">*</span></label><input id="campana-inicio" name="fecha_inicio" type="date" className="form-control" value={formData.fecha_inicio} onChange={handleChange} disabled={isSubmitting} />{errors.fecha_inicio && <p className="field-error">{errors.fecha_inicio}</p>}</div><div className={`form-group col-half ${errors.fecha_fin ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-fin">Fecha de fin</label><input id="campana-fin" name="fecha_fin" type="date" className="form-control" value={formData.fecha_fin} onChange={handleChange} disabled={isSubmitting} />{errors.fecha_fin && <p className="field-error">{errors.fecha_fin}</p>}</div></div>
            <div className={`form-group ${errors.presupuesto ? 'has-error' : ''}`}><label className="form-label" htmlFor="campana-presupuesto">Presupuesto <span className="required">*</span></label><input id="campana-presupuesto" name="presupuesto" type="text" inputMode="decimal" className="form-control" value={formData.presupuesto} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.presupuesto && <p className="field-error">{errors.presupuesto}</p>}<small className="form-help">Máximo dos decimales; no se redondea automáticamente.</small></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Campaña' : 'Registrar Campaña'}</button></div>
        </form>
      </div>
    </div>
  );
}
