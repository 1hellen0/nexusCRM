import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import DepartamentoFormModal from '../components/DepartamentoFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [departamentoToEdit, setDepartamentoToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [departamentoToDelete, setDepartamentoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDepartamentos = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await apiService.getDepartamentos();
      setDepartamentos(Array.isArray(response?.data) ? response.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de departamentos.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDepartamentos(); }, [fetchDepartamentos]);
  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredDepartamentos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return departamentos.filter(departamento => {
      const matchesSearch = departamento.codigo?.toLowerCase().includes(term) || departamento.nombre?.toLowerCase().includes(term);
      const matchesStatus = filterActivo === 'ALL' || String(departamento.activo) === filterActivo;
      return matchesSearch && matchesStatus;
    });
  }, [departamentos, searchTerm, filterActivo]);

  const openCreate = () => { setDepartamentoToEdit(null); setIsFormOpen(true); };
  const openEdit = departamento => { setDepartamentoToEdit(departamento); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setDepartamentoToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (departamentoToEdit) {
        await apiService.updateDepartamento(departamentoToEdit.id_departamento, payload);
        setSuccessMessage(`Departamento "${payload.nombre}" actualizado correctamente.`);
      } else {
        await apiService.createDepartamento(payload);
        setSuccessMessage(`Departamento "${payload.nombre}" creado exitosamente.`);
      }
      setIsFormOpen(false); setDepartamentoToEdit(null); await fetchDepartamentos();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar el departamento.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!departamentoToDelete) return;
    setIsDeleting(true); setError(null);
    try {
      await apiService.deleteDepartamento(departamentoToDelete.id_departamento);
      setSuccessMessage(`Departamento "${departamentoToDelete.nombre}" eliminado correctamente.`);
      setIsDeleteOpen(false); setDepartamentoToDelete(null); await fetchDepartamentos();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar el departamento. Si tiene empleados asociados, el backend rechazará la operación.'));
      setIsDeleteOpen(false);
    } finally { setIsDeleting(false); }
  };

  return (
    <div className="module-view departamentos-view">
      <div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">🏢</span><h2>Departamentos</h2></div><p className="view-subtitle">Gestión del catálogo de departamentos de la organización</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nuevo departamento</button></div></div>
      {successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}
      {error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}
      <div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-departamento-activo" className="filter-label">Estado:</label><select id="filter-departamento-activo" className="filter-select" value={filterActivo} onChange={event => setFilterActivo(event.target.value)}><option value="ALL">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchDepartamentos} disabled={loading}>🔄</button></div></div>
      {loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando catálogo de departamentos...</p></div> : departamentos.length === 0 ? <div className="empty-state"><div className="empty-icon">🏢</div><h3>No hay departamentos registrados</h3><p>Comience agregando un departamento al catálogo.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primer departamento</button></div> : filteredDepartamentos.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron departamentos con los filtros seleccionados.</p><button type="button" className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFilterActivo('ALL'); }}>Restablecer filtros</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th style={{ width: '70px' }}>ID</th><th>Código</th><th>Nombre</th><th style={{ width: '120px' }}>Estado</th><th style={{ width: '180px', textAlign: 'center' }}>Acciones</th></tr></thead><tbody>{filteredDepartamentos.map(departamento => <tr key={departamento.id_departamento} className="table-row"><td className="cell-id">#{departamento.id_departamento}</td><td><span className="sector-tag">{departamento.codigo}</span></td><td className="cell-name"><span className="emp-name">{departamento.nombre}</span></td><td><span className={`status-pill ${departamento.activo ? 'badge-activo' : 'badge-inactivo'}`}>{departamento.activo ? 'Activo' : 'Inactivo'}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar departamento" onClick={() => openEdit(departamento)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar departamento" onClick={() => { setDepartamentoToDelete(departamento); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredDepartamentos.length}</strong> de <strong>{departamentos.length}</strong> departamentos registrados</div></div>}
      <DepartamentoFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} departamentoToEdit={departamentoToEdit} isSubmitting={isSubmitting} />
      <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setDepartamentoToDelete(null); } }} onConfirm={handleConfirmDelete} item={departamentoToDelete} isDeleting={isDeleting} idField="id_departamento" entityName="departamento" confirmMessage={departamentoToDelete && <>¿Está seguro de que desea eliminar el departamento <strong>“{departamentoToDelete.nombre}”</strong> (ID: #{departamentoToDelete.id_departamento})?</>} warningNote="No se puede eliminar un departamento que tenga empleados asociados." />
    </div>
  );
}
