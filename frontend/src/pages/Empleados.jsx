import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import EmpleadoFormModal from '../components/EmpleadoFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartamento, setFilterDepartamento] = useState('ALL');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [empleadoToEdit, setEmpleadoToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [empleadoToDelete, setEmpleadoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = {
        id_departamento: filterDepartamento === 'ALL' ? undefined : filterDepartamento,
        activo: filterActivo === 'ALL' ? undefined : filterActivo
      };
      const [empleadosResponse, departamentosResponse] = await Promise.all([apiService.getEmpleados(params), apiService.getDepartamentos()]);
      setEmpleados(Array.isArray(empleadosResponse?.data) ? empleadosResponse.data : []);
      setDepartamentos(Array.isArray(departamentosResponse?.data) ? departamentosResponse.data : []);
    } catch (err) { setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de empleados y departamentos.')); }
    finally { setLoading(false); }
  }, [filterDepartamento, filterActivo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!successMessage) return undefined; const timer = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(timer); }, [successMessage]);

  const filteredEmpleados = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return empleados.filter(empleado => `${empleado.nombre || ''} ${empleado.apellido || ''} ${empleado.correo || ''}`.toLowerCase().includes(term));
  }, [empleados, searchTerm]);

  const openCreate = () => { setEmpleadoToEdit(null); setIsFormOpen(true); };
  const openEdit = empleado => { setEmpleadoToEdit(empleado); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setEmpleadoToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true); setError(null);
    try {
      if (empleadoToEdit) { await apiService.updateEmpleado(empleadoToEdit.id_empleado, payload); setSuccessMessage(`Empleado "${payload.nombre} ${payload.apellido}" actualizado correctamente.`); }
      else { await apiService.createEmpleado(payload); setSuccessMessage(`Empleado "${payload.nombre} ${payload.apellido}" creado exitosamente.`); }
      setIsFormOpen(false); setEmpleadoToEdit(null); await fetchData();
    } catch (err) { setError(apiErrorMessage(err, 'Ocurrió un error al guardar el empleado.')); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmDelete = async () => {
    if (!empleadoToDelete) return;
    setIsDeleting(true); setError(null);
    try { await apiService.deleteEmpleado(empleadoToDelete.id_empleado); setSuccessMessage(`Empleado "${empleadoToDelete.nombre} ${empleadoToDelete.apellido}" eliminado correctamente.`); setIsDeleteOpen(false); setEmpleadoToDelete(null); await fetchData(); }
    catch (err) { setError(apiErrorMessage(err, 'No se pudo eliminar el empleado porque puede tener registros comerciales asociados.')); setIsDeleteOpen(false); }
    finally { setIsDeleting(false); }
  };

  return (
    <div className="module-view empleados-view">
      <div className="view-header"><div className="view-title-group"><div className="title-with-icon"><span className="page-icon">👥</span><h2>Empleados</h2></div><p className="view-subtitle">Gestión del equipo interno y sus departamentos</p></div><div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nuevo empleado</button></div></div>
      {successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}
      {error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}
      <div className="table-toolbar"><div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por nombre, apellido o correo..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div><div className="filter-group"><label htmlFor="filter-empleado-departamento" className="filter-label">Departamento:</label><select id="filter-empleado-departamento" className="filter-select" value={filterDepartamento} onChange={event => setFilterDepartamento(event.target.value)}><option value="ALL">Todos</option>{departamentos.map(departamento => <option key={departamento.id_departamento} value={departamento.id_departamento}>{departamento.nombre}</option>)}</select><label htmlFor="filter-empleado-activo" className="filter-label">Estado:</label><select id="filter-empleado-activo" className="filter-select" value={filterActivo} onChange={event => setFilterActivo(event.target.value)}><option value="ALL">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchData} disabled={loading}>🔄</button></div></div>
      {loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando catálogo de empleados...</p></div> : empleados.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><h3>No hay empleados registrados</h3><p>Comience agregando un empleado al equipo interno.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primer empleado</button></div> : filteredEmpleados.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron empleados con la búsqueda indicada.</p><button type="button" className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button></div> : <div className="table-responsive"><table className="data-table"><thead><tr><th style={{ width: '60px' }}>ID</th><th>Empleado</th><th>Correo</th><th>Departamento</th><th>Cargo</th><th style={{ width: '110px' }}>Estado</th><th style={{ width: '180px', textAlign: 'center' }}>Acciones</th></tr></thead><tbody>{filteredEmpleados.map(empleado => <tr key={empleado.id_empleado} className="table-row"><td className="cell-id">#{empleado.id_empleado}</td><td className="cell-name"><span className="emp-name">{empleado.nombre} {empleado.apellido}</span>{empleado.telefono && <span className="contact-phone">📞 {empleado.telefono}</span>}</td><td><a href={`mailto:${empleado.correo}`} className="contact-link">{empleado.correo}</a></td><td><span className="sector-tag">{empleado.departamento?.nombre || '—'}</span></td><td>{empleado.cargo}</td><td><span className={`status-pill ${empleado.activo ? 'badge-activo' : 'badge-inactivo'}`}>{empleado.activo ? 'Activo' : 'Inactivo'}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar empleado" onClick={() => openEdit(empleado)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar empleado" onClick={() => { setEmpleadoToDelete(empleado); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredEmpleados.length}</strong> de <strong>{empleados.length}</strong> empleados registrados</div></div>}
      <EmpleadoFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} empleadoToEdit={empleadoToEdit} departamentos={departamentos} isSubmitting={isSubmitting} />
      <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setEmpleadoToDelete(null); } }} onConfirm={handleConfirmDelete} item={empleadoToDelete} isDeleting={isDeleting} idField="id_empleado" entityName="empleado" confirmMessage={empleadoToDelete && <>¿Está seguro de que desea eliminar al empleado <strong>“{empleadoToDelete.nombre} {empleadoToDelete.apellido}”</strong> (ID: #{empleadoToDelete.id_empleado})?</>} warningNote="El backend rechazará la eliminación si el empleado tiene campañas, cotizaciones o contratos asociados." />
    </div>
  );
}
