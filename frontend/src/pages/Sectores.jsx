import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import SectorFormModal from '../components/SectorFormModal';

function apiErrorMessage(error, fallback) {
  if ([400, 404, 409].includes(error?.status)) return error.message || fallback;
  if (error?.status === 401) return 'La sesión no es válida o ha expirado. Inicie sesión nuevamente.';
  return error?.message || fallback;
}

export default function Sectores() {
  const [sectores, setSectores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sectorToEdit, setSectorToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [sectorToDelete, setSectorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSectores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getSectores();
      setSectores(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo cargar el catálogo de sectores.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSectores(); }, [fetchSectores]);
  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredSectores = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sectores.filter(sector => {
      const matchesSearch = sector.nombre?.toLowerCase().includes(term) || sector.descripcion?.toLowerCase().includes(term);
      const matchesStatus = filterActivo === 'ALL' || String(sector.activo) === filterActivo;
      return matchesSearch && matchesStatus;
    });
  }, [sectores, searchTerm, filterActivo]);

  const openCreate = () => { setSectorToEdit(null); setIsFormOpen(true); };
  const openEdit = sector => { setSectorToEdit(sector); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) { setIsFormOpen(false); setSectorToEdit(null); } };

  const handleSave = async payload => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (sectorToEdit) {
        await apiService.updateSector(sectorToEdit.id_sector, payload);
        setSuccessMessage(`Sector "${payload.nombre}" actualizado correctamente.`);
      } else {
        await apiService.createSector(payload);
        setSuccessMessage(`Sector "${payload.nombre}" creado exitosamente.`);
      }
      setIsFormOpen(false);
      setSectorToEdit(null);
      await fetchSectores();
    } catch (err) {
      setError(apiErrorMessage(err, 'Ocurrió un error al guardar el sector.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sectorToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiService.deleteSector(sectorToDelete.id_sector);
      setSuccessMessage(`Sector "${sectorToDelete.nombre}" eliminado correctamente.`);
      setIsDeleteOpen(false);
      setSectorToDelete(null);
      await fetchSectores();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar el sector. Si tiene empresas asociadas, el backend puede rechazar la operación.'));
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="module-view sectores-view">
      <div className="view-header">
        <div className="view-title-group">
          <div className="title-with-icon"><span className="page-icon">🏷️</span><h2>Sectores Empresariales</h2></div>
          <p className="view-subtitle">Gestión del catálogo de sectores de actividad de las empresas</p>
        </div>
        <div className="view-actions"><button type="button" className="btn btn-primary btn-with-icon" onClick={openCreate}><span className="btn-icon">+</span>Nuevo sector</button></div>
      </div>

      {successMessage && <div className="alert alert-success" role="alert"><span className="alert-icon">✓</span><span className="alert-text">{successMessage}</span><button type="button" className="alert-close" onClick={() => setSuccessMessage(null)} aria-label="Cerrar alerta">&times;</button></div>}
      {error && <div className="alert alert-danger" role="alert"><span className="alert-icon">⚠️</span><div className="alert-content"><strong>Atención:</strong> {error}</div><button type="button" className="alert-close" onClick={() => setError(null)} aria-label="Cerrar alerta">&times;</button></div>}

      <div className="table-toolbar">
        <div className="search-box"><span className="search-icon">🔍</span><input type="text" className="search-input" placeholder="Buscar por nombre o descripción..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />{searchTerm && <button type="button" className="clear-search" onClick={() => setSearchTerm('')}>&times;</button>}</div>
        <div className="filter-group"><label htmlFor="filter-sector-activo" className="filter-label">Estado:</label><select id="filter-sector-activo" className="filter-select" value={filterActivo} onChange={event => setFilterActivo(event.target.value)}><option value="ALL">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select><button type="button" className="btn btn-secondary btn-icon-only" title="Recargar listado" onClick={fetchSectores} disabled={loading}>🔄</button></div>
      </div>

      {loading ? <div className="loading-container"><div className="spinner"></div><p>Consultando catálogo de sectores...</p></div> : sectores.length === 0 ? <div className="empty-state"><div className="empty-icon">🏷️</div><h3>No hay sectores registrados</h3><p>Comience agregando un sector empresarial al catálogo.</p><button type="button" className="btn btn-primary" onClick={openCreate}>+ Registrar primer sector</button></div> : filteredSectores.length === 0 ? <div className="empty-state"><div className="empty-icon">🔎</div><h3>Sin coincidencias</h3><p>No se encontraron sectores con los filtros seleccionados.</p><button type="button" className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFilterActivo('ALL'); }}>Restablecer filtros</button></div> : (
        <div className="table-responsive"><table className="data-table"><thead><tr><th style={{ width: '70px' }}>ID</th><th>Nombre</th><th>Descripción</th><th style={{ width: '120px' }}>Estado</th><th style={{ width: '180px', textAlign: 'center' }}>Acciones</th></tr></thead><tbody>{filteredSectores.map(sector => <tr key={sector.id_sector} className="table-row"><td className="cell-id">#{sector.id_sector}</td><td className="cell-name"><span className="emp-name">{sector.nombre}</span></td><td>{sector.descripcion || <span className="text-muted-cell">—</span>}</td><td><span className={`status-pill ${sector.activo ? 'badge-activo' : 'badge-inactivo'}`}>{sector.activo ? 'Activo' : 'Inactivo'}</span></td><td className="cell-actions"><div className="action-buttons"><button type="button" className="btn-action btn-edit" title="Editar sector" onClick={() => openEdit(sector)}>✏️ Editar</button><button type="button" className="btn-action btn-delete" title="Eliminar sector" onClick={() => { setSectorToDelete(sector); setIsDeleteOpen(true); }}>🗑️ Eliminar</button></div></td></tr>)}</tbody></table><div className="table-footer-info">Mostrando <strong>{filteredSectores.length}</strong> de <strong>{sectores.length}</strong> sectores registrados</div></div>
      )}

      <SectorFormModal isOpen={isFormOpen} onClose={closeForm} onSave={handleSave} sectorToEdit={sectorToEdit} isSubmitting={isSubmitting} />
      <ConfirmDeleteModal isOpen={isDeleteOpen} onClose={() => { if (!isDeleting) { setIsDeleteOpen(false); setSectorToDelete(null); } }} onConfirm={handleConfirmDelete} item={sectorToDelete} isDeleting={isDeleting} idField="id_sector" entityName="sector" confirmMessage={sectorToDelete && <>¿Está seguro de que desea eliminar el sector <strong>“{sectorToDelete.nombre}”</strong> (ID: #{sectorToDelete.id_sector})?</>} warningNote="Si existen empresas asociadas, la integridad referencial del backend puede rechazar la eliminación." />
    </div>
  );
}
