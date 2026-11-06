import React, { useEffect, useState } from 'react';

const ESTADOS = ['Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida'];
const DECIMAL_REGEX = /^\d+(\.\d{1,2})?$/;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function CotizacionFormModal({ isOpen, onClose, onSave, cotizacionToEdit, oportunidades, empleados, isSubmitting }) {
  const isEditMode = Boolean(cotizacionToEdit && cotizacionToEdit.id_cotizacion);
  const [formData, setFormData] = useState({ id_oportunidad: '', id_empleado: '', numero_cotizacion: '', version: '1', fecha_emision: '', fecha_vencimiento: '', subtotal: '', total: '', estado: 'Borrador' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      id_oportunidad: cotizacionToEdit?.id_oportunidad ? String(cotizacionToEdit.id_oportunidad) : '',
      id_empleado: cotizacionToEdit?.id_empleado ? String(cotizacionToEdit.id_empleado) : '',
      numero_cotizacion: cotizacionToEdit?.numero_cotizacion || '',
      version: cotizacionToEdit?.version ? String(cotizacionToEdit.version) : '1',
      fecha_emision: cotizacionToEdit?.fecha_emision || '',
      fecha_vencimiento: cotizacionToEdit?.fecha_vencimiento || '',
      subtotal: cotizacionToEdit?.subtotal !== undefined && cotizacionToEdit?.subtotal !== null ? String(cotizacionToEdit.subtotal) : '',
      total: cotizacionToEdit?.total !== undefined && cotizacionToEdit?.total !== null ? String(cotizacionToEdit.total) : '',
      estado: cotizacionToEdit?.estado || 'Borrador'
    });
    setErrors({});
  }, [cotizacionToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors = {};
    const numero = formData.numero_cotizacion.trim();
    const version = formData.version.trim();
    const subtotal = formData.subtotal.trim();
    const total = formData.total.trim();
    if (!formData.id_oportunidad) nextErrors.id_oportunidad = 'Seleccione una oportunidad.';
    if (!formData.id_empleado) nextErrors.id_empleado = 'Seleccione un empleado.';
    if (!numero) nextErrors.numero_cotizacion = 'El número de cotización es obligatorio.';
    else if (numero.length > 40) nextErrors.numero_cotizacion = 'No puede superar los 40 caracteres.';
    if (!/^[1-9]\d*$/.test(version) || !Number.isSafeInteger(Number(version))) nextErrors.version = 'La versión debe ser un entero positivo.';
    if (!isValidDate(formData.fecha_emision)) nextErrors.fecha_emision = 'Ingrese una fecha de emisión válida.';
    if (!isValidDate(formData.fecha_vencimiento)) nextErrors.fecha_vencimiento = 'Ingrese una fecha de vencimiento válida.';
    if (isValidDate(formData.fecha_emision) && isValidDate(formData.fecha_vencimiento) && formData.fecha_vencimiento < formData.fecha_emision) nextErrors.fecha_vencimiento = 'Debe ser igual o posterior a la fecha de emisión.';
    if (!subtotal) nextErrors.subtotal = 'El subtotal es obligatorio.';
    else if (!DECIMAL_REGEX.test(subtotal) || subtotal.split('.')[0].length > 10) nextErrors.subtotal = 'Use un valor no negativo con máximo dos decimales.';
    if (!total) nextErrors.total = 'El total es obligatorio.';
    else if (!DECIMAL_REGEX.test(total) || total.split('.')[0].length > 10) nextErrors.total = 'Use un valor no negativo con máximo dos decimales.';
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
    onSave({ id_oportunidad: Number(formData.id_oportunidad), id_empleado: Number(formData.id_empleado), numero_cotizacion: formData.numero_cotizacion.trim(), version: Number(formData.version), fecha_emision: formData.fecha_emision, fecha_vencimiento: formData.fecha_vencimiento, subtotal: formData.subtotal.trim(), total: formData.total.trim(), estado: formData.estado });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cotizacion-modal-title"><div className="modal-dialog"><div className="modal-header"><div><h3 id="cotizacion-modal-title" className="modal-title">{isEditMode ? 'Editar Cotización' : 'Nueva Cotización'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando cotización #${cotizacionToEdit.id_cotizacion}` : 'Complete los datos de la cotización'}</p></div><button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button></div><form onSubmit={handleSubmit} noValidate><div className="modal-body">
      <div className={`form-group ${errors.id_oportunidad ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-oportunidad">Oportunidad <span className="required">*</span></label><select id="cotizacion-oportunidad" name="id_oportunidad" className="form-select" value={formData.id_oportunidad} onChange={handleChange} disabled={isSubmitting || oportunidades.length === 0}><option value="">Seleccione una oportunidad</option>{oportunidades.map(oportunidad => <option key={oportunidad.id_oportunidad} value={oportunidad.id_oportunidad}>#{oportunidad.id_oportunidad} — {oportunidad.titulo}</option>)}</select>{oportunidades.length === 0 && <p className="field-error">No hay oportunidades disponibles.</p>}{errors.id_oportunidad && <p className="field-error">{errors.id_oportunidad}</p>}</div>
      <div className={`form-group ${errors.id_empleado ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-empleado">Empleado responsable <span className="required">*</span></label><select id="cotizacion-empleado" name="id_empleado" className="form-select" value={formData.id_empleado} onChange={handleChange} disabled={isSubmitting || empleados.length === 0}><option value="">Seleccione un empleado</option>{empleados.map(empleado => <option key={empleado.id_empleado} value={empleado.id_empleado}>{empleado.nombre} {empleado.apellido} — {empleado.cargo}</option>)}</select>{empleados.length === 0 && <p className="field-error">No hay empleados disponibles.</p>}{errors.id_empleado && <p className="field-error">{errors.id_empleado}</p>}</div>
      <div className="form-row"><div className={`form-group col-half ${errors.numero_cotizacion ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-numero">Número de cotización <span className="required">*</span></label><input id="cotizacion-numero" name="numero_cotizacion" type="text" className="form-control" maxLength={40} value={formData.numero_cotizacion} onChange={handleChange} disabled={isSubmitting} />{errors.numero_cotizacion && <p className="field-error">{errors.numero_cotizacion}</p>}</div><div className={`form-group col-half ${errors.version ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-version">Versión <span className="required">*</span></label><input id="cotizacion-version" name="version" type="number" min="1" step="1" className="form-control" value={formData.version} onChange={handleChange} disabled={isSubmitting} />{errors.version && <p className="field-error">{errors.version}</p>}</div></div>
      <div className="form-row"><div className={`form-group col-half ${errors.fecha_emision ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-emision">Fecha de emisión <span className="required">*</span></label><input id="cotizacion-emision" name="fecha_emision" type="date" className="form-control" value={formData.fecha_emision} onChange={handleChange} disabled={isSubmitting} />{errors.fecha_emision && <p className="field-error">{errors.fecha_emision}</p>}</div><div className={`form-group col-half ${errors.fecha_vencimiento ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-vencimiento">Fecha de vencimiento <span className="required">*</span></label><input id="cotizacion-vencimiento" name="fecha_vencimiento" type="date" className="form-control" value={formData.fecha_vencimiento} onChange={handleChange} disabled={isSubmitting} />{errors.fecha_vencimiento && <p className="field-error">{errors.fecha_vencimiento}</p>}</div></div>
      <div className="form-row"><div className={`form-group col-half ${errors.subtotal ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-subtotal">Subtotal <span className="required">*</span></label><input id="cotizacion-subtotal" name="subtotal" type="text" inputMode="decimal" className="form-control" value={formData.subtotal} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.subtotal && <p className="field-error">{errors.subtotal}</p>}</div><div className={`form-group col-half ${errors.total ? 'has-error' : ''}`}><label className="form-label" htmlFor="cotizacion-total">Total <span className="required">*</span></label><input id="cotizacion-total" name="total" type="text" inputMode="decimal" className="form-control" value={formData.total} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.total && <p className="field-error">{errors.total}</p>}</div></div><small className="form-help">Los importes se envían exactamente como fueron escritos; no se recalculan.</small>
      <div className="form-group"><label className="form-label" htmlFor="cotizacion-estado">Estado <span className="required">*</span></label><select id="cotizacion-estado" name="estado" className="form-select" value={formData.estado} onChange={handleChange} disabled={isSubmitting}>{ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}</select>{errors.estado && <p className="field-error">{errors.estado}</p>}</div>
    </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Cotización' : 'Registrar Cotización'}</button></div></form></div></div>
  );
}
