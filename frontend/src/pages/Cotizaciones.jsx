import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CotizacionFormModal from '../components/CotizacionFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

function CotizacionDetailsModal({ cotizacion, onClose }) {
  if (!cotizacion) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cotizacion-detalles-title"><div className="modal-dialog"><div className="modal-header"><div><h3 id="cotizacion-detalles-title" className="modal-title">Consulta de Cotización</h3><p className="modal-subtitle">{cotizacion.numero_cotizacion} · Versión {cotizacion.version}</p></div><button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">&times;</button></div><div className="modal-body"><div className="read-only-meta"><div className="meta-badge"><span className="meta-label">Oportunidad</span><span className="meta-val">{cotizacion.oportunidad?.titulo || `#${cotizacion.id_oportunidad}`}</span></div><div className="meta-badge"><span className="meta-label">Empleado</span><span className="meta-val">{cotizacion.empleado ? `${cotizacion.empleado.nombre} ${cotizacion.empleado.apellido}` : `#${cotizacion.id_empleado}`}</span></div></div><h4>Detalles asociados</h4>{cotizacion.detalles?.length ? <div className="table-responsive"><table className="data-table"><thead><tr><th>ID</th><th>Producto</th><th>Cantidad</th><th>Precio pactado</th><th>Descuento</th><th>Subtotal</th></tr></thead><tbody>{cotizacion.detalles.map(detalle => <tr key={detalle.id_detalle_cotizacion}><td>#{detalle.id_detalle_cotizacion}</td><td>#{detalle.id_producto}</td><td>{detalle.cantidad}</td><td>{detalle.precio_unitario_pactado}</td><td>{detalle.descuento_porcentaje}%</td><td>{detalle.subtotal_linea}</td></tr>)}</tbody></table></div> : <p className="text-muted-cell">No hay detalles de cotización asociados.</p>}{cotizacion.contrato && <div className="health-success-box"><div className="health-row"><span className="health-label">Contrato relacionado</span><span className="health-val">{cotizacion.contrato.numero_contrato || `#${cotizacion.contrato.id_contrato}`}</span></div><div className="health-row"><span className="health-label">Estado</span><span className="health-val">{cotizacion.contrato.estado}</span></div></div>}</div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button></div></div></div>;
}

export default function Cotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [filterOportunidad, setFilterOportunidad] = useState('ALL');
  const [filterEmpleado, setFilterEmpleado] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cotizacionToEdit, setCotizacionToEdit] = useState(null);
  const [cotizacionToView, setCotizacionToView] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [cotizacionToDelete, setCotizacionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { estado: filterEstado === 'ALL' ? undefined : filterEstado, id_oportunidad: filterOportunidad === 'ALL' ? undefined : filterOportunidad, id_empleado: filterEmpleado === 'ALL' ? undefined : filterEmpleado };
      const [cotizacionesResponse, oportunidadesResponse, empleadosResponse] = await Promise.all([apiService.getCotizaciones(params), apiService.getOportunidades(), apiService.getEmpleados()]);
      setCotizaciones(Array.isArray(cotizacionesResponse?.data) ? cotizacionesResponse.data : []);
      setOportunidades(Array.isArray(oportunidadesResponse?.data) ? oportunidadesResponse.data : []);
      setEmpleados(Array.isArray(empleadosResponse?.data) ? empleadosResponse.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de cotizaciones, oportunidades y empleados.')); }
    finally { setLoading(false); }
  }, [filterEstado, filterOportunidad, filterEmpleado]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!successMessage) return undefined; const timer = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(timer); }, [successMessage]);

  const filteredCotizaciones = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return cotizaciones.filter(cotizacion => cotizacion.numero_cotizacion?.toLowerCase().includes(term));
  }, [cotizaciones, searchTerm]);

  const openCreate = () => { setCotizacionToEdit(null); setIsFormOpen(true); };
  const openEdit = cotizacion => { setCotizacionToEdit(cotizacion); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setCotizacionToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (cotizacionToEdit) { await apiService.updateCotizacion(cotizacionToEdit.id_cotizacion, payload); setSuccessMessage(`Cotización "${payload.numero_cotizacion}" actualizada correctamente.`); }
      else { await apiService.createCotizacion(payload); setSuccessMessage(`Cotización "${payload.numero_cotizacion}" creada exitosamente.`); }
      setIsFormOpen(false); setCotizacionToEdit(null); await fetchData();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar la cotización.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!cotizacionToDelete) return;
    setIsDeleting(true); setError(null);
    try { await apiService.deleteCotizacion(cotizacionToDelete.id_cotizacion); setSuccessMessage(`Cotización "${cotizacionToDelete.numero_cotizacion}" eliminada correctamente.`); setIsDeleteOpen(false); setCotizacionToDelete(null); await fetchData(); }
    catch (err) { setError(apiErrorMessage(err, 'No se pudo eliminar la cotización por una restricción referencial.')); setIsDeleteOpen(false); }
    finally { setIsDeleting(false); }
  };

  return <div className="module-view cotizaciones-view"><div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">🧾</span><h2>Cotizaciones</h2></div><p className="view-subtitle">Gestión de cotizaciones comerciales y sus asociaciones</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nueva cotización</button></div></div>{successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}{error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}<div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por número de cotización..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-cotizacion-estado" className="filter-label">Estado:</label><select id="filter-cotizacion-estado" className="filter-select" value={filterEstado} onChange={event => setFilterEstado(event.target.value)}><option value="ALL">Todos</option><option value="Borrador">Borradores</option><option value="Enviada">Enviadas</option><option value="Aprobada">Aprobadas</option><option value="Rechazada">Rechazadas</option><option value="Vencida">Vencidas</option></select><label htmlFor="filter-cotizacion-oportunidad" className="filter-label">Oportunidad:</label><select id="filter-cotizacion-oportunidad" className="filter-select" value={filterOportunidad} onChange={event => setFilterOportunidad(event.target.value)}><option value="ALL">Todas</option>{oportunidades.map(oportunidad => <option key={oportunidad.id_oportunidad} value={oportunidad.id_oportunidad}>#{oportunidad.id_oportunidad} — {oportunidad.titulo}</option>)}</select><label htmlFor="filter-cotizacion-empleado" className="filter-label">Empleado:</label><select id="filter-cotizacion-empleado" className="filter-select" value={filterEmpleado} onChange={event => setFilterEmpleado(event.target.value)}><option value="ALL">Todos</option>{empleados.map(empleado => <option key={empleado.id_empleado} value={empleado.id_empleado}>{empleado.nombre} {empleado.apellido}</option>)}</select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchData} disabled={loading}>🔄</button></div></div>{loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando cotizaciones...</p></div> : cotizaciones.length === 0 ? <div className="empty-state"><div className="empty-icon">🧾</div><h3>No hay cotizaciones registradas</h3><p>Comience agregando una cotización comercial.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primera cotización</button></div> : filteredCotizaciones.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron cotizaciones con la búsqueda indicada.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th>ID</th><th>Número</th><th>Oportunidad</th><th>Empleado</th><th>Fechas</th><th>Importes</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filteredCotizaciones.map(cotizacion => <tr key={cotizacion.id_cotizacion} className="table-row"><td className="cell-id">#{cotizacion.id_cotizacion}</td><td className="cell-name"><span className="emp-name">{cotizacion.numero_cotizacion}</span><span className="contact-phone">Versión {cotizacion.version}</span></td><td>{cotizacion.oportunidad?.titulo || `#${cotizacion.id_oportunidad}`}</td><td>{cotizacion.empleado ? `${cotizacion.empleado.nombre} ${cotizacion.empleado.apellido}` : `#${cotizacion.id_empleado}`}</td><td>{cotizacion.fecha_emision} — {cotizacion.fecha_vencimiento}</td><td>Subtotal: {cotizacion.subtotal}<br />Total: {cotizacion.total}</td><td><span className="status-pill badge-default">{cotizacion.estado}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action" title="Consultar detalles" onClick={() => setCotizacionToView(cotizacion)}>👁️ Ver</button><button type="button" className="btn-action btn-edit" title="Editar cotización" onClick={() => openEdit(cotizacion)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar cotización" onClick={() => { setCotizacionToDelete(cotizacion); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredCotizaciones.length}</strong> de <strong>{cotizaciones.length}</strong> cotizaciones</div></div>}<CotizacionFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} cotizacionToEdit={cotizacionToEdit} oportunidades={oportunidades} empleados={empleados} isSubmitting={isSubmitting} /><CotizacionDetailsModal cotizacion={cotizacionToView} onClose={() => setCotizacionToView(null)} /><ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setCotizacionToDelete(null); } }} onConfirm={handleConfirmDelete} item={cotizacionToDelete} isDeleting={isDeleting} idField="id_cotizacion" entityName="cotización" confirmMessage={cotizacionToDelete && <>¿Está seguro de que desea eliminar la cotización <strong>“{cotizacionToDelete.numero_cotizacion}”</strong>? Esta acción puede eliminar sus detalles asociados y desvincular contratos según las reglas del backend.</>} warningNote="No se eliminan registros manualmente desde React; el backend aplicará las reglas referenciales existentes." /></div>;
}
