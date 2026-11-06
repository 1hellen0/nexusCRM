import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import EmpresaFormModal from '../components/EmpresaFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filtro de búsqueda local
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');

  // Estado del modal de creación / edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [empresaToEdit, setEmpresaToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del modal de confirmación de eliminación
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carga de empresas desde el backend
  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getEmpresas();
      // El backend retorna { status: 'success', total: n, data: [...] }
      if (response && Array.isArray(response.data)) {
        setEmpresas(response.data);
      } else {
        setEmpresas([]);
      }
    } catch (err) {
      console.error('Error cargando empresas:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  // Limpiar mensaje de éxito después de 4 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Manejar creación / edición
  const handleOpenCreate = () => {
    setEmpresaToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (empresa) => {
    setEmpresaToEdit(empresa);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEmpresaToEdit(null);
  };

  const handleSaveEmpresa = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (empresaToEdit && empresaToEdit.id_empresa) {
        // Actualizar
        await apiService.updateEmpresa(empresaToEdit.id_empresa, payload);
        setSuccessMessage(`Empresa "${payload.nombre}" actualizada correctamente.`);
      } else {
        // Crear
        await apiService.createEmpresa(payload);
        setSuccessMessage(`Empresa "${payload.nombre}" creada exitosamente.`);
      }
      setIsFormOpen(false);
      setEmpresaToEdit(null);
      await fetchEmpresas();
    } catch (err) {
      console.error('Error al guardar empresa:', err);
      // Si la API devuelve un mensaje específico en err.message
      setError(err.message || 'Ocurrió un error al guardar la empresa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación
  const handleOpenDelete = (empresa) => {
    setEmpresaToDelete(empresa);
    setIsDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setEmpresaToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!empresaToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiService.deleteEmpresa(empresaToDelete.id_empresa);
      setSuccessMessage(`Empresa "${empresaToDelete.nombre}" eliminada correctamente.`);
      setIsDeleteOpen(false);
      setEmpresaToDelete(null);
      await fetchEmpresas();
    } catch (err) {
      console.error('Error al eliminar empresa:', err);
      if (err.status === 409) {
        setError('No se puede eliminar la empresa porque tiene registros asociados (contactos u oportunidades relacionadas).');
      } else {
        setError(err.message || 'Error al eliminar la empresa.');
      }
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado de la lista en memoria
  const filteredEmpresas = empresas.filter(emp => {
    const matchSearch =
      emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.correo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.telefono?.includes(searchTerm);

    const matchEstado = filterEstado === 'ALL' || emp.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'Activo':
        return 'badge-activo';
      case 'Prospecto':
        return 'badge-prospecto';
      case 'Inactivo':
        return 'badge-inactivo';
      default:
        return 'badge-default';
    }
  };

  return (
    <div className="module-view empresas-view">
      {/* Encabezado del Módulo */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="title-with-icon">
            <span className="page-icon">🏢</span>
            <h2>Empresas</h2>
          </div>
          <p className="view-subtitle">
            Gestión del catálogo de clientes y cuentas empresariales B2B
          </p>
        </div>

        <div className="view-actions">
          <button
            type="button"
            className="btn btn-primary btn-with-icon"
            onClick={handleOpenCreate}
            id="btn-nueva-empresa"
          >
            <span className="btn-icon">+</span>
            Nueva empresa
          </button>
        </div>
      </div>

      {/* Alertas globales de éxito y error */}
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
            placeholder="Buscar por nombre, sector, correo o teléfono..."
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
          <label htmlFor="filter-estado" className="filter-label">Estado:</label>
          <select
            id="filter-estado"
            className="filter-select"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            <option value="Prospecto">Prospecto</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            title="Recargar listado"
            onClick={fetchEmpresas}
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Contenido principal: Carga, Vacío o Tabla */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Consultando catálogo de empresas...</p>
        </div>
      ) : empresas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>No hay empresas registradas</h3>
          <p>
            Comience agregando una nueva empresa cliente para gestionar su ciclo comercial B2B.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
          >
            + Registrar primera empresa
          </button>
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>Sin coincidencias</h3>
          <p>
            No se encontraron empresas que coincidan con &ldquo;{searchTerm}&rdquo; o el filtro seleccionado.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setSearchTerm(''); setFilterEstado('ALL'); }}
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Nombre de la Empresa</th>
                <th>Sector</th>
                <th>Contacto</th>
                <th style={{ width: '120px' }}>Estado</th>
                <th style={{ width: '150px' }}>Fecha Registro</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmpresas.map((emp) => (
                <tr key={emp.id_empresa} className="table-row">
                  <td className="cell-id">#{emp.id_empresa}</td>
                  <td className="cell-name">
                    <span className="emp-name">{emp.nombre}</span>
                  </td>
                  <td className="cell-sector">
                    <span className="sector-tag">{emp.sector}</span>
                  </td>
                  <td className="cell-contact">
                    <div className="contact-info">
                      {emp.correo ? (
                        <a href={`mailto:${emp.correo}`} className="contact-link" title="Enviar correo">
                          ✉️ {emp.correo}
                        </a>
                      ) : (
                        <span className="text-muted-cell">—</span>
                      )}
                      {emp.telefono && (
                        <span className="contact-phone" title="Teléfono">
                          📞 {emp.telefono}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${getEstadoBadgeClass(emp.estado)}`}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="cell-date">
                    {emp.fecha_registro
                      ? new Date(emp.fecha_registro).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '—'}
                  </td>
                  <td className="cell-actions">
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-action btn-edit"
                        title="Editar empresa"
                        onClick={() => handleOpenEdit(emp)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-delete"
                        title="Eliminar empresa"
                        onClick={() => handleOpenDelete(emp)}
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
            Mostrando <strong>{filteredEmpresas.length}</strong> de <strong>{empresas.length}</strong> empresas registradas
          </div>
        </div>
      )}

      {/* Modal de Formulario (Crear / Editar) */}
      <EmpresaFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveEmpresa}
        empresaToEdit={empresaToEdit}
        isSubmitting={isSubmitting}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        item={empresaToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

