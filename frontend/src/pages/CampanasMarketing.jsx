import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CampanaMarketingFormModal from '../components/CampanaMarketingFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function CampanasMarketing() {
  const [campanas, setCampanas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterEmpleado, setFilterEmpleado] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [campanaToEdit, setCampanaToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [campanaToDelete, setCampanaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { tipo: filterTipo === 'ALL' ? undefined : filterTipo, estado: filterEstado === 'ALL' ? undefined : filterEstado, id_empleado_responsable: filterEmpleado === 'ALL' ? undefined : filterEmpleado };
      const [campanasResponse, empleadosResponse] = await Promise.all([apiService.getCampanasMarketing(params), apiService.getEmpleados()]);
      setCampanas(Array.isArray(campanasResponse?.data) ? campanasResponse.data : []);
      setEmpleados(Array.isArray(empleadosResponse?.data) ? empleadosResponse.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de campañas y empleados.')); }
    finally { setLoading(false); }
  }, [filterTipo, filterEstado, filterEmpleado]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!successMessage) return undefined; const timer = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(timer); }, [successMessage]);

  const filteredCampanas = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return campanas.filter(campana => campana.nombre?.toLowerCase().includes(term));
  }, [campanas, searchTerm]);

  const openCreate = () => { setCampanaToEdit(null); setIsFormOpen(true); };
  const openEdit = campana => { setCampanaToEdit(campana); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setCampanaToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (campanaToEdit) { await apiService.updateCampanaMarketing(campanaToEdit.id_campana, payload); setSuccessMessage(`Campaña "${payload.nombre}" actualizada correctamente.`); }
      else { await apiService.createCampanaMarketing(payload); setSuccessMessage(`Campaña "${payload.nombre}" creada exitosamente.`); }
      setIsFormOpen(false); setCampanaToEdit(null); await fetchData();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar la campaña.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!campanaToDelete) return;
    setIsDeleting(true); setError(null);
    try { await apiService.deleteCampanaMarketing(campanaToDelete.id_campana); setSuccessMessage(`Campaña "${campanaToDelete.nombre}" eliminada correctamente.`); setIsDeleteOpen(false); setCampanaToDelete(null); await fetchData(); }
    catch (err) { setError(apiErrorMessage(err, 'No se pudo eliminar la campaña. El backend aplicará las restricciones referenciales existentes.')); setIsDeleteOpen(false); }
    finally { setIsDeleting(false); }
  };

  return (
    <div className="module-view campanas-marketing-view">
      <div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">📣</span><h2>Campañas de Marketing</h2></div><p className="view-subtitle">Gestión de campañas y responsables de marketing</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nueva campaña</button></div></div>
      {successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}
      {error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}
      <div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por nombre..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-campana-tipo" className="filter-label">Tipo:</label><select id="filter-campana-tipo" className="filter-select" value={filterTipo} onChange={event => setFilterTipo(event.target.value)}><option value="ALL">Todos</option><option value="Email">Email</option><option value="Webinar">Webinar</option><option value="Feria">Feria</option><option value="Digital">Digital</option><option value="Directa">Directa</option></select><label htmlFor="filter-campana-estado" className="filter-label">Estado:</label><select id="filter-campana-estado" className="filter-select" value={filterEstado} onChange={event => setFilterEstado(event.target.value)}><option value="ALL">Todos</option><option value="Planificada">Planificadas</option><option value="Activa">Activas</option><option value="Finalizada">Finalizadas</option><option value="Cancelada">Canceladas</option></select><label htmlFor="filter-campana-empleado" className="filter-label">Responsable:</label><select id="filter-campana-empleado" className="filter-select" value={filterEmpleado} onChange={event => setFilterEmpleado(event.target.value)}><option value="ALL">Todos</option>{empleados.map(empleado => <option key={empleado.id_empleado} value={empleado.id_empleado}>{empleado.nombre} {empleado.apellido}</option>)}</select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchData} disabled={loading}>🔄</button></div></div>
      {loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando campañas de marketing...</p></div> : campanas.length === 0 ? <div className="empty-state"><div className="empty-icon">📣</div><h3>No hay campañas registradas</h3><p>Comience agregando una campaña de marketing.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primera campaña</button></div> : filteredCampanas.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron campañas con la búsqueda indicada.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th style={{ width: '65px' }}>ID</th><th>Nombre</th><th>Tipo</th><th>Responsable</th><th>Fechas</th><th>Presupuesto</th><th>Estado</th><th style={{ width: '180px', textAlign: 'center' }}>Acciones</th></tr></thead><tbody>{filteredCampanas.map(campana => <tr key={campana.id_campana} className="table-row"><td className="cell-id">#{campana.id_campana}</td><td className="cell-name"><span className="emp-name">{campana.nombre}</span></td><td><span className="sector-tag">{campana.tipo}</span></td><td>{campana.responsable ? `${campana.responsable.nombre} ${campana.responsable.apellido}` : '—'}</td><td>{campana.fecha_inicio}{campana.fecha_fin ? ` — ${campana.fecha_fin}` : ''}</td><td>{campana.presupuesto}</td><td><span className="status-pill badge-default">{campana.estado}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar campaña" onClick={() => openEdit(campana)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar campaña" onClick={() => { setCampanaToDelete(campana); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredCampanas.length}</strong> de <strong>{campanas.length}</strong> campañas registradas</div></div>}
      <CampanaMarketingFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} campanaToEdit={campanaToEdit} empleados={empleados} isSubmitting={isSubmitting} />
      <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setCampanaToDelete(null); } }} onConfirm={handleConfirmDelete} item={campanaToDelete} isDeleting={isDeleting} idField="id_campana" entityName="campaña" confirmMessage={campanaToDelete && <>¿Está seguro de que desea eliminar la campaña <strong>“{campanaToDelete.nombre}”</strong> (ID: #{campanaToDelete.id_campana})?</>} warningNote="Las oportunidades relacionadas conservarán el comportamiento referencial definido por el backend." />
    </div>
  );
}
