import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import OportunidadFormModal from '../components/OportunidadFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const VALID_ETAPAS = ['Nueva', 'Contactada', 'Propuesta', 'Negociacion', 'Ganada', 'Perdida'];

export default function Oportunidades({ onNavigateToEmpresas, onNavigateToContactos }) {
  const [oportunidades, setOportunidades] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('ALL');

  // Estado del modal de creación / edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [oportunidadToEdit, setOportunidadToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del modal de confirmación de eliminación
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [oportunidadToDelete, setOportunidadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carga de catálogos necesarios (empresas, contactos y oportunidades)
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [opRes, empRes, conRes] = await Promise.all([
        apiService.getOportunidades(),
        apiService.getEmpresas(),
        apiService.getContactos()
      ]);

      if (opRes && Array.isArray(opRes.data)) {
        setOportunidades(opRes.data);
      } else {
        setOportunidades([]);
      }

      if (empRes && Array.isArray(empRes.data)) {
        setEmpresas(empRes.data);
      } else {
        setEmpresas([]);
      }

      if (conRes && Array.isArray(conRes.data)) {
        setContactos(conRes.data);
      } else {
        setContactos([]);
      }
    } catch (err) {
      console.error('Error cargando oportunidades o catálogos:', err);
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

  // Manejar apertura de formulario
  const handleOpenCreate = () => {
    setOportunidadToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (op) => {
    setOportunidadToEdit(op);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setOportunidadToEdit(null);
  };

  const handleSaveOportunidad = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (oportunidadToEdit && oportunidadToEdit.id_oportunidad) {
        await apiService.updateOportunidad(oportunidadToEdit.id_oportunidad, payload);
        setSuccessMessage(`Oportunidad "${payload.titulo}" actualizada exitosamente.`);
      } else {
        await apiService.createOportunidad(payload);
        setSuccessMessage(`Oportunidad "${payload.titulo}" registrada en el pipeline.`);
      }
      setIsFormOpen(false);
      setOportunidadToEdit(null);
      await fetchAllData();
    } catch (err) {
      console.error('Error guardando oportunidad:', err);
      if (err.status === 400 && err.message.includes('no pertenece')) {
        setError('Error de integridad: El contacto seleccionado no pertenece a la empresa indicada.');
      } else {
        setError(err.message || 'Ocurrió un error al guardar la oportunidad.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación
  const handleOpenDelete = (op) => {
    setOportunidadToDelete(op);
    setIsDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setOportunidadToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!oportunidadToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiService.deleteOportunidad(oportunidadToDelete.id_oportunidad);
      setSuccessMessage(`Oportunidad "${oportunidadToDelete.titulo}" eliminada correctamente.`);
      setIsDeleteOpen(false);
      setOportunidadToDelete(null);
      await fetchAllData();
    } catch (err) {
      console.error('Error al eliminar oportunidad:', err);
      if (err.status === 409) {
        setError('No se puede eliminar la oportunidad comercial porque tiene actividades de seguimiento asociadas.');
      } else {
        setError(err.message || 'Error al eliminar la oportunidad.');
      }
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado de la lista en memoria
  const filteredOportunidades = oportunidades.filter(op => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      op.titulo?.toLowerCase().includes(term) ||
      op.empresa?.nombre?.toLowerCase().includes(term) ||
      op.contacto?.nombre?.toLowerCase().includes(term) ||
      op.descripcion?.toLowerCase().includes(term);

    const matchEtapa = filterEtapa === 'ALL' || op.etapa === filterEtapa;
    return matchSearch && matchEtapa;
  });

  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(num);
  };

  const getEtapaBadgeClass = (etapa) => {
    switch (etapa) {
      case 'Nueva': return 'badge-etapa-nueva';
      case 'Contactada': return 'badge-etapa-contactada';
      case 'Propuesta': return 'badge-etapa-propuesta';
      case 'Negociacion': return 'badge-etapa-negociacion';
      case 'Ganada': return 'badge-etapa-ganada';
      case 'Perdida': return 'badge-etapa-perdida';
      default: return 'badge-default';
    }
  };

  return (
    <div className="module-view oportunidades-view">
      {/* Encabezado del Módulo */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="title-with-icon">
            <span className="page-icon">🎯</span>
            <h2>Oportunidades Comerciales</h2>
          </div>
          <p className="view-subtitle">
            Pipeline comercial B2B con integridad referencial compuesta (Empresa - Contacto Principal)
          </p>
        </div>

        <div className="view-actions">
          <button
            type="button"
            className="btn btn-primary btn-with-icon"
            onClick={handleOpenCreate}
            id="btn-nueva-oportunidad"
          >
            <span className="btn-icon">+</span>
            Nueva oportunidad
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

      {/* Barra de herramientas / Búsqueda y filtrado */}
      <div className="table-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por título, empresa o contacto..."
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
          <label htmlFor="filter-etapa" className="filter-label">Etapa:</label>
          <select
            id="filter-etapa"
            className="filter-select"
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
          >
            <option value="ALL">Todas las etapas</option>
            {VALID_ETAPAS.map(et => (
              <option key={et} value={et}>{et}</option>
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
          <p>Consultando pipeline de oportunidades...</p>
        </div>
      ) : oportunidades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No hay oportunidades comerciales registradas</h3>
          <p>
            Defina nuevos prospectos de negocio vinculando una empresa cliente y su contacto principal.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            disabled={empresas.length === 0 || contactos.length === 0}
          >
            + Registrar primera oportunidad
          </button>
        </div>
      ) : filteredOportunidades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>Sin coincidencias</h3>
          <p>
            No se encontraron oportunidades que coincidan con &ldquo;{searchTerm}&rdquo; o el filtro seleccionado.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setSearchTerm(''); setFilterEtapa('ALL'); }}
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
                <th>Oportunidad Comercial</th>
                <th>Cuenta / Empresa</th>
                <th>Contacto Principal</th>
                <th style={{ width: '130px' }}>Valor Estimado</th>
                <th style={{ width: '120px' }}>Etapa</th>
                <th style={{ width: '125px' }}>Cierre Est.</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOportunidades.map((op) => (
                <tr key={op.id_oportunidad} className="table-row">
                  <td className="cell-id">#{op.id_oportunidad}</td>
                  <td className="cell-name">
                    <strong className="emp-name">{op.titulo}</strong>
                    {op.descripcion && (
                      <span className="desc-preview" title={op.descripcion}>
                        {op.descripcion.length > 60
                          ? `${op.descripcion.slice(0, 60)}...`
                          : op.descripcion}
                      </span>
                    )}
                  </td>
                  <td className="cell-company">
                    <span className="company-name-text">
                      🏢 {op.empresa?.nombre || `Empresa #${op.id_empresa}`}
                    </span>
                  </td>
                  <td className="cell-contact-lead">
                    <span className="contact-lead-name">
                      👤 {op.contacto?.nombre || `Contacto #${op.id_contacto}`}
                    </span>
                    {op.contacto?.cargo && (
                      <span className="contact-lead-role">{op.contacto.cargo}</span>
                    )}
                  </td>
                  <td className="cell-amount">
                    <span className="amount-text">{formatCurrency(op.valor_estimado)}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${getEtapaBadgeClass(op.etapa)}`}>
                      {op.etapa}
                    </span>
                  </td>
                  <td className="cell-date">
                    {op.fecha_cierre_estimada || '—'}
                  </td>
                  <td className="cell-actions">
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-action btn-edit"
                        title="Editar oportunidad"
                        onClick={() => handleOpenEdit(op)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-delete"
                        title="Eliminar oportunidad"
                        onClick={() => handleOpenDelete(op)}
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
            Mostrando <strong>{filteredOportunidades.length}</strong> de <strong>{oportunidades.length}</strong> oportunidades comerciales
          </div>
        </div>
      )}

      {/* Modal Formulario Oportunidad */}
      <OportunidadFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveOportunidad}
        oportunidadToEdit={oportunidadToEdit}
        isSubmitting={isSubmitting}
        empresas={empresas}
        contactos={contactos}
        onNavigateToEmpresas={onNavigateToEmpresas}
        onNavigateToContactos={onNavigateToContactos}
      />

      {/* Modal Confirmar Eliminación */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        item={oportunidadToDelete}
        isDeleting={isDeleting}
        title="Confirmar Eliminación de Oportunidad"
        entityName="oportunidad"
        idField="id_oportunidad"
        confirmMessage={
          oportunidadToDelete ? (
            <>
              ¿Está seguro de que desea eliminar la oportunidad comercial <strong>&ldquo;{oportunidadToDelete.titulo}&rdquo;</strong> (ID: #{oportunidadToDelete.id_oportunidad})?
            </>
          ) : null
        }
        warningNote="Nota: Si la oportunidad cuenta con actividades de seguimiento registradas, la base de datos rechazará la eliminación por integridad referencial (HTTP 409)."
      />
    </div>
  );
}

