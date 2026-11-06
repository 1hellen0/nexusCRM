import React, { useEffect, useState } from 'react';

const TIPOS = ['Producto', 'Servicio'];
const MONEDA_REGEX = /^[A-Za-z]{3}$/;
const PRECIO_REGEX = /^\d+(\.\d{1,2})?$/;

export default function ProductoServicioFormModal({ isOpen, onClose, onSave, productoToEdit, categorias, isSubmitting }) {
  const isEditMode = Boolean(productoToEdit && productoToEdit.id_producto);
  const [formData, setFormData] = useState({ id_categoria: '', codigo_sku: '', nombre: '', tipo: 'Producto', precio_unitario: '', moneda: 'USD', activo: true });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      id_categoria: productoToEdit?.id_categoria ? String(productoToEdit.id_categoria) : '',
      codigo_sku: productoToEdit?.codigo_sku || '',
      nombre: productoToEdit?.nombre || '',
      tipo: productoToEdit?.tipo || 'Producto',
      precio_unitario: productoToEdit?.precio_unitario !== undefined && productoToEdit?.precio_unitario !== null ? String(productoToEdit.precio_unitario) : '',
      moneda: productoToEdit?.moneda || 'USD',
      activo: productoToEdit?.activo !== false
    });
    setErrors({});
  }, [productoToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors = {};
    const sku = formData.codigo_sku.trim();
    const nombre = formData.nombre.trim();
    const precio = formData.precio_unitario.trim();
    const moneda = formData.moneda.trim();
    if (!formData.id_categoria) nextErrors.id_categoria = 'Seleccione una categoría.';
    if (!sku) nextErrors.codigo_sku = 'El código SKU es obligatorio.';
    else if (sku.length > 50) nextErrors.codigo_sku = 'El código SKU no puede superar los 50 caracteres.';
    if (!nombre) nextErrors.nombre = 'El nombre es obligatorio.';
    else if (nombre.length > 150) nextErrors.nombre = 'El nombre no puede superar los 150 caracteres.';
    if (!TIPOS.includes(formData.tipo)) nextErrors.tipo = 'Seleccione un tipo válido.';
    if (!precio) nextErrors.precio_unitario = 'El precio unitario es obligatorio.';
    else if (!PRECIO_REGEX.test(precio) || precio.split('.')[0].length > 10) nextErrors.precio_unitario = 'Use un número mayor o igual a 0 con máximo dos decimales.';
    if (!MONEDA_REGEX.test(moneda)) nextErrors.moneda = 'La moneda debe tener exactamente 3 letras.';
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
    onSave({ id_categoria: Number(formData.id_categoria), codigo_sku: formData.codigo_sku.trim(), nombre: formData.nombre.trim(), tipo: formData.tipo, precio_unitario: formData.precio_unitario.trim(), moneda: formData.moneda.trim().toUpperCase(), activo: formData.activo });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="producto-modal-title">
      <div className="modal-dialog">
        <div className="modal-header"><div><h3 id="producto-modal-title" className="modal-title">{isEditMode ? 'Editar Producto o Servicio' : 'Nuevo Producto o Servicio'}</h3><p className="modal-subtitle">{isEditMode ? `Modificando registro #${productoToEdit.id_producto}` : 'Complete los datos del catálogo'}</p></div><button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">&times;</button></div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className={`form-group ${errors.id_categoria ? 'has-error' : ''}`}><label className="form-label" htmlFor="producto-categoria">Categoría <span className="required">*</span></label><select id="producto-categoria" name="id_categoria" className="form-select" value={formData.id_categoria} onChange={handleChange} disabled={isSubmitting || categorias.length === 0}><option value="">Seleccione una categoría</option>{categorias.map(categoria => <option key={categoria.id_categoria} value={categoria.id_categoria}>{categoria.nombre}</option>)}</select>{categorias.length === 0 && <p className="field-error">No hay categorías disponibles.</p>}{errors.id_categoria && <p className="field-error">{errors.id_categoria}</p>}</div>
            <div className="form-row"><div className={`form-group col-half ${errors.codigo_sku ? 'has-error' : ''}`}><label className="form-label" htmlFor="producto-sku">Código SKU <span className="required">*</span></label><input id="producto-sku" name="codigo_sku" type="text" className="form-control" maxLength={50} value={formData.codigo_sku} onChange={handleChange} disabled={isSubmitting} />{errors.codigo_sku && <p className="field-error">{errors.codigo_sku}</p>}</div><div className={`form-group col-half ${errors.tipo ? 'has-error' : ''}`}><label className="form-label" htmlFor="producto-tipo">Tipo <span className="required">*</span></label><select id="producto-tipo" name="tipo" className="form-select" value={formData.tipo} onChange={handleChange} disabled={isSubmitting}>{TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}</select>{errors.tipo && <p className="field-error">{errors.tipo}</p>}</div></div>
            <div className={`form-group ${errors.nombre ? 'has-error' : ''}`}><label className="form-label" htmlFor="producto-nombre">Nombre <span className="required">*</span></label><input id="producto-nombre" name="nombre" type="text" className="form-control" maxLength={150} value={formData.nombre} onChange={handleChange} disabled={isSubmitting} autoFocus />{errors.nombre && <p className="field-error">{errors.nombre}</p>}</div>
            <div className="form-row"><div className={`form-group col-half ${errors.precio_unitario ? 'has-error' : ''}`}><label className="form-label" htmlFor="producto-precio">Precio unitario <span className="required">*</span></label><input id="producto-precio" name="precio_unitario" type="text" inputMode="decimal" className="form-control" value={formData.precio_unitario} onChange={handleChange} disabled={isSubmitting} placeholder="0.00" />{errors.precio_unitario && <p className="field-error">{errors.precio_unitario}</p>}<small className="form-help">Máximo 2 decimales; no se redondea automáticamente.</small></div><div className={`form-group col-half ${errors.moneda ? 'has-error' : ''}`}><label className="form-label" htmlFor="producto-moneda">Moneda <span className="required">*</span></label><input id="producto-moneda" name="moneda" type="text" className="form-control" maxLength={3} value={formData.moneda} onChange={handleChange} disabled={isSubmitting} placeholder="USD" />{errors.moneda && <p className="field-error">{errors.moneda}</p>}</div></div>
            <div className="form-group form-check-group"><label className="form-check-label"><input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} disabled={isSubmitting} /><span>Registro activo</span></label></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar Registro' : 'Registrar Registro'}</button></div>
        </form>
      </div>
    </div>
  );
}
