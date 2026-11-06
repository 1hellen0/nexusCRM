import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ProductoServicioFormModal from '../components/ProductoServicioFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function ProductosServicios() {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('ALL');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { id_categoria: filterCategoria === 'ALL' ? undefined : filterCategoria, tipo: filterTipo === 'ALL' ? undefined : filterTipo, activo: filterActivo === 'ALL' ? undefined : filterActivo };
      const [itemsResponse, categoriasResponse] = await Promise.all([apiService.getProductosServicios(params), apiService.getCategoriasProducto()]);
      setItems(Array.isArray(itemsResponse?.data) ? itemsResponse.data : []);
      setCategorias(Array.isArray(categoriasResponse?.data) ? categoriasResponse.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de productos y servicios.')); }
    finally { setLoading(false); }
  }, [filterCategoria, filterTipo, filterActivo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!successMessage) return undefined; const timer = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(timer); }, [successMessage]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter(item => `${item.codigo_sku || ''} ${item.nombre || ''}`.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const openCreate = () => { setItemToEdit(null); setIsFormOpen(true); };
  const openEdit = item => { setItemToEdit(item); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setItemToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (itemToEdit) { await apiService.updateProductoServicio(itemToEdit.id_producto, payload); setSuccessMessage(`Registro "${payload.nombre}" actualizado correctamente.`); }
      else { await apiService.createProductoServicio(payload); setSuccessMessage(`Registro "${payload.nombre}" creado exitosamente.`); }
      setIsFormOpen(false); setItemToEdit(null); await fetchData();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar el producto o servicio.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true); setError(null);
    try { await apiService.deleteProductoServicio(itemToDelete.id_producto); setSuccessMessage(`Registro "${itemToDelete.nombre}" eliminado correctamente.`); setIsDeleteOpen(false); setItemToDelete(null); await fetchData(); }
    catch (err) { setError(apiErrorMessage(err, 'No se puede eliminar: el registro puede estar asociado a cotizaciones o facturas.')); setIsDeleteOpen(false); }
    finally { setIsDeleting(false); }
  };

  return (
    <div className="module-view productos-servicios-view">
      <div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">📦</span><h2>Productos y Servicios</h2></div><p className="view-subtitle">Gestión del catálogo comercial de productos y servicios</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nuevo registro</button></div></div>
      {successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}
      {error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}
      <div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por nombre o código SKU..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-producto-categoria" className="filter-label">Categoría:</label><select id="filter-producto-categoria" className="filter-select" value={filterCategoria} onChange={event => setFilterCategoria(event.target.value)}><option value="ALL">Todas</option>{categorias.map(categoria => <option key={categoria.id_categoria} value={categoria.id_categoria}>{categoria.nombre}</option>)}</select><label htmlFor="filter-producto-tipo" className="filter-label">Tipo:</label><select id="filter-producto-tipo" className="filter-select" value={filterTipo} onChange={event => setFilterTipo(event.target.value)}><option value="ALL">Todos</option><option value="Producto">Productos</option><option value="Servicio">Servicios</option></select><label htmlFor="filter-producto-activo" className="filter-label">Estado:</label><select id="filter-producto-activo" className="filter-select" value={filterActivo} onChange={event => setFilterActivo(event.target.value)}><option value="ALL">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchData} disabled={loading}>🔄</button></div></div>
      {loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando catálogo comercial...</p></div> : items.length === 0 ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No hay productos o servicios registrados</h3><p>Comience agregando un registro al catálogo comercial.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primero</button></div> : filteredItems.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron registros con la búsqueda indicada.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th style={{ width: '65px' }}>ID</th><th>SKU</th><th>Nombre</th><th>Tipo</th><th>Categoría</th><th>Precio</th><th style={{ width: '100px' }}>Estado</th><th style={{ width: '180px', textAlign: 'center' }}>Acciones</th></tr></thead><tbody>{filteredItems.map(item => <tr key={item.id_producto} className="table-row"><td className="cell-id">#{item.id_producto}</td><td><span className="sector-tag">{item.codigo_sku}</span></td><td className="cell-name"><span className="emp-name">{item.nombre}</span></td><td>{item.tipo}</td><td>{item.categoria?.nombre || '—'}</td><td>{item.precio_unitario} {item.moneda}</td><td><span className={`status-pill ${item.activo ? 'badge-activo' : 'badge-inactivo'}`}>{item.activo ? 'Activo' : 'Inactivo'}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar registro" onClick={() => openEdit(item)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar registro" onClick={() => { setItemToDelete(item); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> registros</div></div>}
      <ProductoServicioFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} productoToEdit={itemToEdit} categorias={categorias} isSubmitting={isSubmitting} />
      <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setItemToDelete(null); } }} onConfirm={handleConfirmDelete} item={itemToDelete} isDeleting={isDeleting} idField="id_producto" entityName="registro" confirmMessage={itemToDelete && <>¿Está seguro de que desea eliminar <strong>“{itemToDelete.nombre}”</strong> (SKU: {itemToDelete.codigo_sku})?</>} warningNote="No se puede eliminar un producto o servicio que tenga detalles de cotización o factura asociados." />
    </div>
  );
}
