import React, { useEffect, useState } from 'react';

const DECIMAL_REGEX = /^\d+(\.\d{1,2})?$/;

export default function DetalleCotizacionFormModal({ isOpen, onClose, onSave, detalleToEdit, cotizaciones, productos, isSubmitting }) {
  const isEditMode = Boolean(detalleToEdit && detalleToEdit.id_detalle_cotizacion);
  const [formData, setFormData] = useState({ id_cotizacion: '', id_producto: '', cantidad: '', precio_unitario_pactado: '', descuento_porcentaje: '0.00', subtotal_linea: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      id_cotizacion: detalleToEdit?.id_cotizacion ? String(detalleToEdit.id_cotizacion) : '',
      id_producto: detalleToEdit?.id_producto ? String(detalleToEdit.id_producto) : '',
      cantidad: detalleToEdit?.cantidad !== undefined && detalleToEdit?.cantidad !== null ? String(detalleToEdit.cantidad) : '',
      precio_unitario_pactado: detalleToEdit?.precio_unitario_pactado !== undefined && detalleToEdit?.precio_unitario_pactado !== null ? String(detalleToEdit.precio_unitario_pactado) : '',
      descuento_porcentaje: detalleToEdit?.descuento_porcentaje !== undefined && detalleToEdit?.descuento_porcentaje !== null ? String(detalleToEdit.descuento_porcentaje) : '0.00',
      subtotal_linea: detalleToEdit?.subtotal_linea !== undefined && detalleToEdit?.subtotal_linea !== null ? String(detalleToEdit.subtotal_linea) : ''
    });
    setErrors({});
  }, [detalleToEdit, isOpen]);

  if (!isOpen) return null;

  const validateDecimal = (value, label, maxIntegerDigits, minValue = 0, required = true) => {
    const clean = value.trim();
    if (!clean && !required) return null;
    if (!clean) return `${label} es obligatorio.`;
    if (!DECIMAL_REGEX.test(clean) || clean.split('.')[0].length > maxIntegerDigits || Number(clean) < minValue) return `${label} debe ser numérico, con máximo 2 decimales y mayor o igual a ${minValue}.`;
    return null;
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.id_cotizacion) nextErrors.id_cotizacion = 'Seleccione una cotización.';
    if (!formData.id_producto) nextErrors.id_producto = 'Seleccione un producto o servicio.';
    const cantidadError = validateDecimal(formData.cantidad, 'La cantidad', 8, 0.01);
    const precioError = validateDecimal(formData.precio_unitario_pactado, 'El precio unitario pactado', 10);
    const descuento = formData.descuento_porcentaje.trim();
    const descuentoError = validateDecimal(descuento, 'El descuento', 3, 0, false);
    const subtotalError = validateDecimal(formData.subtotal_linea, 'El subtotal de línea', 10);
    if (cantidadError) nextErrors.cantidad = cantidadError;
    if (precioError) nextErrors.precio_unitario_pactado = precioError;
    if (descuentoError || (descuento && Number(descuento) > 100)) nextErrors.descuento_porcentaje = descuentoError || 'El descuento debe estar entre 0 y 100.';
    if (subtotalError) nextErrors.subtotal_linea = subtotalError;
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
    onSave({ id_cotizacion: Number(formData.id_cotizacion), id_producto: Number(formData.id_producto), cantidad: formData.cantidad.trim(), precio_unitario_pactado: formData.precio_unitario_pactado.trim(), descuento_porcentaje: formData.descuento_porcentaje.trim() || '0.00', subtotal_linea: formData.subtotal_linea.trim() });
  };

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="detalle-modal-title"><div className="modal-dialog"><div className="modal-header"><div><h3 id="detalle-modal-title" className="modal-title">{isEditMode ? 'Editar Detalle' : 'Nuevo Detalle de Cotización'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando detalle #${detalleToEdit.id_detalle_cotizacion}` : 'Complete los valores históricos del detalle'}</p></div><button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button></div><form onSubmit={handleSubmit} noValidate><div className="modal-body">
    <div className={`form-group ${errors.id_cotizacion ? 'has-error' : ''}`}><label className="form-label" htmlFor="detalle-cotizacion">Cotización <span className="required">*</span></label><select id="detalle-cotizacion" name="id_cotizacion" className="form-select" value={formData.id_cotizacion} onChange={handleChange} disabled={isSubmitting || cotizaciones.length === 0}><option value="">Seleccione una cotización</option>{cotizaciones.map(cotizacion => <option key={cotizacion.id_cotizacion} value={cotizacion.id_cotizacion}>{cotizacion.numero_cotizacion}</option>)}</select>{cotizaciones.length === 0 && <p className="field-error">No hay cotizaciones disponibles.</p>}{errors.id_cotizacion && <p className="field-error">{errors.id_cotizacion}</p>}</div>
    <div className={`form-group ${errors.id_producto ? 'has-error' : ''}`}><label className="form-label" htmlFor="detalle-producto">Producto o Servicio <span className="required">*</span></label><select id="detalle-producto" name="id_producto" className="form-select" value={formData.id_producto} onChange={handleChange} disabled={isSubmitting || productos.length === 0}><option value="">Seleccione un producto o servicio</option>{productos.map(producto => <option key={producto.id_producto} value={producto.id_producto}>{producto.codigo_sku} — {producto.nombre}</option>)}</select>{productos.length === 0 && <p className="field-error">No hay productos o servicios disponibles.</p>}{errors.id_producto && <p className="field-error">{errors.id_producto}</p>}</div>
    <div className="form-row"><div className={`form-group col-half ${errors.cantidad ? 'has-error' : ''}`}><label className="form-label" htmlFor="detalle-cantidad">Cantidad <span className="required">*</span></label><input id="detalle-cantidad" name="cantidad" type="text" inputMode="decimal" className="form-control" value={formData.cantidad} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.cantidad && <p className="field-error">{errors.cantidad}</p>}</div><div className={`form-group col-half ${errors.precio_unitario_pactado ? 'has-error' : ''}`}><label className="form-label" htmlFor="detalle-precio">Precio unitario pactado <span className="required">*</span></label><input id="detalle-precio" name="precio_unitario_pactado" type="text" inputMode="decimal" className="form-control" value={formData.precio_unitario_pactado} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.precio_unitario_pactado && <p className="field-error">{errors.precio_unitario_pactado}</p>}</div></div>
    <div className="form-row"><div className={`form-group col-half ${errors.descuento_porcentaje ? 'has-error' : ''}`}><label className="form-label" htmlFor="detalle-descuento">Descuento (%)</label><input id="detalle-descuento" name="descuento_porcentaje" type="text" inputMode="decimal" className="form-control" value={formData.descuento_porcentaje} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.descuento_porcentaje && <p className="field-error">{errors.descuento_porcentaje}</p>}</div><div className={`form-group col-half ${errors.subtotal_linea ? 'has-error' : ''}`}><label className="form-label" htmlFor="detalle-subtotal">Subtotal de línea <span className="required">*</span></label><input id="detalle-subtotal" name="subtotal_linea" type="text" inputMode="decimal" className="form-control" value={formData.subtotal_linea} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.subtotal_linea && <p className="field-error">{errors.subtotal_linea}</p>}</div></div><small className="form-help">Los importes se envían exactamente como fueron escritos; no se recalculan.</small>
  </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Detalle' : 'Registrar Detalle'}</button></div></form></div></div>;
}
