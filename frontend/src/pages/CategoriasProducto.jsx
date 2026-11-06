import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CategoriaProductoFormModal from '../components/CategoriaProductoFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function CategoriasProducto() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categoriaToEdit, setCategoriaToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategorias = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await apiService.getCategoriasProducto({ activo: filterActivo === 'ALL' ? undefined : filterActivo });
      setCategorias(Array.isArray(response?.data) ? response.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de categorías.')); }
    finally { setLoading(false); }
  }, [filterActivo]);

  useEffect(() => { fetchCategorias(); }, [fetchCategorias]);
  useEffect(() => { if (!successMessage) return undefined; const timer = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(timer); }, [successMessage]);

  const filteredCategorias = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return categorias.filter(categoria => categoria.nombre?.toLowerCase().includes(term));
  }, [categorias, searchTerm]);

  const openCreate = () => { setCategoriaToEdit(null); setIsFormOpen(true); };
  const openEdit = categoria => { setCategoriaToEdit(categoria); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setCategoriaToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (categoriaToEdit) { await apiService.updateCategoriaProducto(categoriaToEdit.id_categoria, payload); setSuccessMessage(`Categoría "${payload.nombre}" actualizada correctamente.`); }
      else { await apiService.createCategoriaProducto(payload); setSuccessMessage(`Categoría "${payload.nombre}" creada exitosamente.`); }
      setIsFormOpen(false); setCategoriaToEdit(null); await fetchCategorias();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar la categoría.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!categoriaToDelete) return;
    setIsDeleting(true); setError(null);
    try { await apiService.deleteCategoriaProducto(categoriaToDelete.id_categoria); setSuccessMessage(`Categoría "${categoriaToDelete.nombre}" eliminada correctamente.`); setIsDeleteOpen(false); setCategoriaToDelete(null); await fetchCategorias(); }
    catch (err) { setError(apiErrorMessage(err, 'No se pudo eliminar la categoría. Si tiene productos o servicios asociados, el backend rechazará la operación.')); setIsDeleteOpen(false); }
    finally { setIsDeleting(false); }
  };

  return (
    <div className="module-view categorias-producto-view">
      <div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">🗂️</span><h2>Categorías de Productos</h2></div><p className="view-subtitle">Gestión del catálogo de categorías para productos y servicios</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nueva categoría</button></div></div>
      {successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}
      {error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}
      <div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por nombre..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-categoria-activo" className="filter-label">Estado:</label><select id="filter-categoria-activo" className="filter-select" value={filterActivo} onChange={event => setFilterActivo(event.target.value)}><option value="ALL">Todos</option><option value="true">Activas</option><option value="false">Inactivas</option></select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchCategorias} disabled={loading}>🔄</button></div></div>
      {loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando catálogo de categorías...</p></div> : categorias.length === 0 ? <div className="empty-state"><div className="empty-icon">🗂️</div><h3>No hay categorías registradas</h3><p>Comience agregando una categoría al catálogo.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primera categoría</button></div> : filteredCategorias.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron categorías con la búsqueda indicada.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th style={{ width: '70px' }}>ID</th><th>Nombre</th><th>Descripción</th><th style={{ width: '120px' }}>Estado</th><th style={{ width: '180px', textAlign: 'center' }}>Acciones</th></tr></thead><tbody>{filteredCategorias.map(categoria => <tr key={categoria.id_categoria} className="table-row"><td className="cell-id">#{categoria.id_categoria}</td><td className="cell-name"><span className="emp-name">{categoria.nombre}</span></td><td>{categoria.descripcion || <span className="text-muted-cell">—</span>}</td><td><span className={`status-pill ${categoria.activo ? 'badge-activo' : 'badge-inactivo'}`}>{categoria.activo ? 'Activa' : 'Inactiva'}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar categoría" onClick={() => openEdit(categoria)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar categoría" onClick={() => { setCategoriaToDelete(categoria); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredCategorias.length}</strong> de <strong>{categorias.length}</strong> categorías registradas</div></div>}
      <CategoriaProductoFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} categoriaToEdit={categoriaToEdit} isSubmitting={isSubmitting} />
      <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setCategoriaToDelete(null); } }} onConfirm={handleConfirmDelete} item={categoriaToDelete} isDeleting={isDeleting} idField="id_categoria" entityName="categoría" confirmMessage={categoriaToDelete && <>¿Está seguro de que desea eliminar la categoría <strong>“{categoriaToDelete.nombre}”</strong> (ID: #{categoriaToDelete.id_categoria})?</>} warningNote="No se puede eliminar una categoría que tenga productos o servicios asociados." />
    </div>
  );
}
