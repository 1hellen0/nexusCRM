import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import DetalleCotizacionFormModal from '../components/DetalleCotizacionFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function DetallesCotizacion({ initialCotizacionId = null }) {
  const [detalles, setDetalles] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCotizacion, setFilterCotizacion] = useState(initialCotizacionId ? String(initialCotizacionId) : 'ALL');
  const [filterProducto, setFilterProducto] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detalleToEdit, setDetalleToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [detalleToDelete, setDetalleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { id_cotizacion: filterCotizacion === 'ALL' ? undefined : filterCotizacion, id_producto: filterProducto === 'ALL' ? undefined : filterProducto };
      const [detallesResponse, cotizacionesResponse, productosResponse] = await Promise.all([apiService.getDetallesCotizacion(params), apiService.getCotizaciones(), apiService.getProductosServicios()]);
      setDetalles(Array.isArray(detallesResponse?.data) ? detallesResponse.data : []);
      setCotizaciones(Array.isArray(cotizacionesResponse?.data) ? cotizacionesResponse.data : []);
      setProductos(Array.isArray(productosResponse?.data) ? productosResponse.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de detalles, cotizaciones y productos.')); }
    finally { setLoading(false); }
  }, [filterCotizacion, filterProducto]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (initialCotizacionId) setFilterCotizacion(String(initialCotizacionId)); }, [initialCotizacionId]);
  useEffect(() => { if (!successMessage) return undefined; const timer = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(timer); }, [successMessage]);

  const filteredDetalles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return detalles.filter(detalle => `${detalle.cotizacion?.numero_cotizacion || ''} ${detalle.producto?.codigo_sku || ''} ${detalle.producto?.nombre || ''}`.toLowerCase().includes(term));
  }, [detalles, searchTerm]);

  const openCreate = () => { setDetalleToEdit(null); setIsFormOpen(true); };
  const openEdit = detalle => { setDetalleToEdit(detalle); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setDetalleToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (detalleToEdit) { await apiService.updateDetalleCotizacion(detalleToEdit.id_detalle_cotizacion, payload); setSuccessMessage('Detalle actualizado correctamente.'); }
      else { await apiService.createDetalleCotizacion(payload); setSuccessMessage('Detalle creado exitosamente.'); }
      setIsFormOpen(false); setDetalleToEdit(null); await fetchData();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar el detalle.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!detalleToDelete) return;
    setIsDeleting(true); setError(null);
    try { await apiService.deleteDetalleCotizacion(detalleToDelete.id_detalle_cotizacion); setSuccessMessage('Detalle eliminado correctamente.'); setIsDeleteOpen(false); setDetalleToDelete(null); await fetchData(); }
    catch (err) { setError(apiErrorMessage(err, 'No se pudo eliminar el detalle por una restricción referencial.')); setIsDeleteOpen(false); }
    finally { setIsDeleting(false); }
  };

  return <div className="module-view detalles-cotizacion-view"><div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">📋</span><h2>Detalles de Cotización</h2></div><p className="view-subtitle">Gestión de líneas históricas asociadas a cotizaciones</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nuevo detalle</button></div></div>{successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}{error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}<div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por cotización, SKU o producto..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-detalle-cotizacion" className="filter-label">Cotización:</label><select id="filter-detalle-cotizacion" className="filter-select" value={filterCotizacion} onChange={event => setFilterCotizacion(event.target.value)}><option value="ALL">Todas</option>{cotizaciones.map(cotizacion => <option key={cotizacion.id_cotizacion} value={cotizacion.id_cotizacion}>{cotizacion.numero_cotizacion}</option>)}</select><label htmlFor="filter-detalle-producto" className="filter-label">Producto:</label><select id="filter-detalle-producto" className="filter-select" value={filterProducto} onChange={event => setFilterProducto(event.target.value)}><option value="ALL">Todos</option>{productos.map(producto => <option key={producto.id_producto} value={producto.id_producto}>{producto.codigo_sku} — {producto.nombre}</option>)}</select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchData} disabled={loading}>🔄</button></div></div>{loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando detalles de cotización...</p></div> : detalles.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><h3>No hay detalles registrados</h3><p>Comience agregando una línea a una cotización.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primer detalle</button></div> : filteredDetalles.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron detalles con los filtros indicados.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th>ID</th><th>Cotización</th><th>Producto / Servicio</th><th>Cantidad</th><th>Precio pactado</th><th>Descuento</th><th>Subtotal línea</th><th>Acciones</th></tr></thead><tbody>{filteredDetalles.map(detalle => <tr key={detalle.id_detalle_cotizacion} className="table-row"><td className="cell-id">#{detalle.id_detalle_cotizacion}</td><td>{detalle.cotizacion?.numero_cotizacion || `#${detalle.id_cotizacion}`}</td><td><span className="emp-name">{detalle.producto?.nombre || `#${detalle.id_producto}`}</span>{detalle.producto?.codigo_sku && <span className="contact-phone">{detalle.producto.codigo_sku}</span>}</td><td>{detalle.cantidad}</td><td>{detalle.precio_unitario_pactado}</td><td>{detalle.descuento_porcentaje}%</td><td>{detalle.subtotal_linea}</td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar detalle" onClick={() => openEdit(detalle)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar detalle" onClick={() => { setDetalleToDelete(detalle); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredDetalles.length}</strong> de <strong>{detalles.length}</strong> detalles registrados</div></div>}{/* Los importes se muestran y envían sin ser recalculados en React. */}<DetalleCotizacionFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} detalleToEdit={detalleToEdit} cotizaciones={cotizaciones} productos={productos} isSubmitting={isSubmitting} /><ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setDetalleToDelete(null); } }} onConfirm={handleConfirmDelete} item={detalleToDelete} isDeleting={isDeleting} idField="id_detalle_cotizacion" entityName="detalle" confirmMessage={detalleToDelete && <>¿Está seguro de que desea eliminar el detalle de la cotización <strong>#{detalleToDelete.id_detalle_cotizacion}</strong>?</>} warningNote="La eliminación queda sujeta a las restricciones referenciales del backend." /></div>;
}
