import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import ActividadFormModal from '../components/ActividadFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const VALID_TIPOS = ['Llamada', 'Reunion', 'Correo', 'Otro'];
const VALID_ESTADOS = ['Pendiente', 'Completada', 'Cancelada'];

export default function Actividades({ onNavigateToOportunidades }) {
  const [actividades, setActividades] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('ALL');
  const [filterEstado, setFilterEstado] = useState('ALL');

  // Estado de modal de creación / edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actividadToEdit, setActividadToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado de modal de confirmación de eliminación
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [actividadToDelete, setActividadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carga de actividades y oportunidades
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [actRes, opRes] = await Promise.all([
        apiService.getActividades(),
        apiService.getOportunidades()
      ]);

      if (actRes && Array.isArray(actRes.data)) {
        setActividades(actRes.data);
      } else {
        setActividades([]);
      }

      if (opRes && Array.isArray(opRes.data)) {
        setOportunidades(opRes.data);
      } else {
        setOportunidades([]);
      }
    } catch (err) {
      console.error('Error cargando actividades o catálogos:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Limpiar mensaje de éxito después de 4 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleOpenCreate = () => {
    setActividadToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (act) => {
    setActividadToEdit(act);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setActividadToEdit(null);
  };

  const handleSaveActividad = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (actividadToEdit && actividadToEdit.id_actividad) {
        await apiService.updateActividad(actividadToEdit.id_actividad, payload);
        setSuccessMessage('Actividad de seguimiento actualizada exitosamente.');
      } else {
        await apiService.createActividad(payload);
        setSuccessMessage('Actividad de seguimiento registrada correctamente.');
      }
      setIsFormOpen(false);
      setActividadToEdit(null);
      await fetchAllData();
    } catch (err) {
      console.error('Error guardando actividad:', err);
      setError(err.message || 'Ocurrió un error al guardar la actividad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (act) => {
    setActividadToDelete(act);
    setIsDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setActividadToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!actividadToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiService.deleteActividad(actividadToDelete.id_actividad);
      setSuccessMessage('Actividad de seguimiento eliminada correctamente.');
      setIsDeleteOpen(false);
      setActividadToDelete(null);
      await fetchAllData();
    } catch (err) {
      console.error('Error al eliminar actividad:', err);
      setError(err.message || 'Error al eliminar la actividad.');
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado de la lista en memoria
  const filteredActividades = actividades.filter(act => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      act.descripcion?.toLowerCase().includes(term) ||
      act.oportunidad?.titulo?.toLowerCase().includes(term) ||
      act.tipo?.toLowerCase().includes(term);

    const matchTipo = filterTipo === 'ALL' || act.tipo === filterTipo;
    const matchEstado = filterEstado === 'ALL' || act.estado === filterEstado;

    return matchSearch && matchTipo && matchEstado;
  });

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'Llamada': return '📞';
      case 'Reunion': return '👥';
      case 'Correo': return '✉️';
      case 'Otro': return '📝';
      default: return '📌';
    }
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Pendiente': return 'badge-estado-pendiente';
      case 'Completada': return 'badge-estado-completada';
      case 'Cancelada': return 'badge-estado-cancelada';
      default: return 'badge-default';
    }
  };

  return (
    <div className="module-view actividades-view">
      {/* Encabezado del Módulo */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="title-with-icon">
            <span className="page-icon">📅</span>
            <h2>Actividades de Seguimiento</h2>
          </div>
          <p className="view-subtitle">
            Bitácora de interacciones, minutas, reuniones y llamadas vinculadas a oportunidades comerciales
          </p>
        </div>

        <div className="view-actions">
          <button
            type="button"
            className="btn btn-primary btn-with-icon"
            onClick={handleOpenCreate}
            id="btn-nueva-actividad"
          >
            <span className="btn-icon">+</span>
            Nueva actividad
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMessage && (
        <div className="alert alert-success" role="alert">
          <span className="alert-icon">✓</span>
          <span className="alert-text">{successMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Cerrar alerta"
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <strong>Atención:</strong> {error}
          </div>
          <button
            type="button"
            className="alert-close"
            onClick={() => setError(null)}
            aria-label="Cerrar alerta"
          >
            &times;
          </button>
        </div>
      )}

      {/* Barra de herramientas / Búsqueda y doble filtrado */}
      <div className="table-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por descripción, oportunidad o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              &times;
            </button>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="filter-tipo" className="filter-label">Tipo:</label>
          <select
            id="filter-tipo"
            className="filter-select"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="ALL">Todos los tipos</option>
            {VALID_TIPOS.map(tp => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>

          <label htmlFor="filter-estado" className="filter-label" style={{ marginLeft: '0.4rem' }}>Estado:</label>
          <select
            id="filter-estado"
            className="filter-select"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            {VALID_ESTADOS.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            title="Recargar listado"
            onClick={fetchAllData}
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Consultando bitácora de actividades...</p>
        </div>
      ) : actividades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No hay actividades registradas</h3>
          <p>
            Lleve una bitácora detallada de llamadas, reuniones y acuerdos alcanzados con sus prospectos comerciales.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            disabled={oportunidades.length === 0}
          >
            + Registrar primera actividad
          </button>
        </div>
      ) : filteredActividades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>Sin coincidencias</h3>
          <p>
            No se encontraron actividades que coincidan con los filtros o la búsqueda ingresada.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setSearchTerm(''); setFilterTipo('ALL'); setFilterEstado('ALL'); }}
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '55px' }}>ID</th>
                <th style={{ width: '120px' }}>Tipo</th>
                <th>Oportunidad Comercial Vinculada</th>
                <th>Descripción / Minuta</th>
                <th style={{ width: '160px' }}>Fecha y Hora</th>
                <th style={{ width: '110px' }}>Estado</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredActividades.map((act) => (
                <tr key={act.id_actividad} className="table-row">
                  <td className="cell-id">#{act.id_actividad}</td>
                  <td>
                    <span className="tipo-tag">
                      <span className="tipo-icon">{getTipoIcon(act.tipo)}</span>
                      {act.tipo}
                    </span>
                  </td>
                  <td className="cell-company">
                    <strong className="company-name-text">
                      🎯 {act.oportunidad?.titulo || `Oportunidad #${act.id_oportunidad}`}
                    </strong>
                    {act.oportunidad?.etapa && (
                      <span className="company-sub-text">Etapa: {act.oportunidad.etapa}</span>
                    )}
                  </td>
                  <td className="cell-desc">
                    <p className="activity-desc-text">{act.descripcion}</p>
                  </td>
                  <td className="cell-date">
                    <span className="datetime-display">
                      {formatDateTime(act.fecha_actividad)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${getEstadoBadgeClass(act.estado)}`}>
                      {act.estado}
                    </span>
                  </td>
                  <td className="cell-actions">
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-action btn-edit"
                        title="Editar actividad"
                        onClick={() => handleOpenEdit(act)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-delete"
                        title="Eliminar actividad"
                        onClick={() => handleOpenDelete(act)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer-info">
            Mostrando <strong>{filteredActividades.length}</strong> de <strong>{actividades.length}</strong> actividades de seguimiento
          </div>
        </div>
      )}

      {/* Modal Formulario Actividad */}
      <ActividadFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveActividad}
        actividadToEdit={actividadToEdit}
        isSubmitting={isSubmitting}
        oportunidades={oportunidades}
        onNavigateToOportunidades={onNavigateToOportunidades}
      />

      {/* Modal Confirmar Eliminación Reutilizado */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        item={actividadToDelete}
        isDeleting={isDeleting}
        title="Confirmar Eliminación de Actividad"
        entityName="actividad"
        idField="id_actividad"
        confirmMessage={
          actividadToDelete ? (
            <>
              ¿Está seguro de que desea eliminar la actividad <strong>&ldquo;{actividadToDelete.tipo}&rdquo;</strong> (ID: #{actividadToDelete.id_actividad})?
            </>
          ) : null
        }
        warningNote="Esta acción eliminará el registro de la minuta o interacción del historial comercial de forma permanente."
      />
    </div>
  );
}

