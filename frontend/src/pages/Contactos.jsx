import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import ContactoFormModal from '../components/ContactoFormModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

export default function Contactos({ onNavigateToEmpresas }) {
  const [contactos, setContactos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('ALL');

  // Estado del modal de creación / edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contactoToEdit, setContactoToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del modal de confirmación de eliminación
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contactoToDelete, setContactoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carga de empresas para selector y nombres
  const fetchEmpresas = useCallback(async () => {
    setLoadingEmpresas(true);
    try {
      const response = await apiService.getEmpresas();
      if (response && Array.isArray(response.data)) {
        setEmpresas(response.data);
      } else {
        setEmpresas([]);
      }
    } catch (err) {
      console.error('Error al cargar empresas en módulo contactos:', err);
    } finally {
      setLoadingEmpresas(false);
    }
  }, []);

  // Carga del listado de contactos
  const fetchContactos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContactos();
      // El backend retorna { status: 'success', total: n, data: [...] } con include: 'empresa'
      if (response && Array.isArray(response.data)) {
        setContactos(response.data);
      } else {
        setContactos([]);
      }
    } catch (err) {
      console.error('Error al consultar contactos:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
    fetchContactos();
  }, [fetchEmpresas, fetchContactos]);

  // Limpiar mensaje de éxito después de 4 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Manejar creación / edición
  const handleOpenCreate = () => {
    setContactoToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contacto) => {
    setContactoToEdit(contacto);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setContactoToEdit(null);
  };

  const handleSaveContacto = async (payload) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (contactoToEdit && contactoToEdit.id_contacto) {
        // Actualizar contacto
        await apiService.updateContacto(contactoToEdit.id_contacto, payload);
        setSuccessMessage(`Contacto "${payload.nombre}" actualizado correctamente.`);
      } else {
        // Crear contacto
        await apiService.createContacto(payload);
        setSuccessMessage(`Contacto "${payload.nombre}" registrado exitosamente.`);
      }
      setIsFormOpen(false);
      setContactoToEdit(null);
      await fetchContactos();
    } catch (err) {
      console.error('Error al guardar contacto:', err);
      if (err.status === 409) {
        setError('Conflicto referencial: No se puede cambiar la empresa del contacto porque tiene oportunidades comerciales vinculadas.');
      } else {
        setError(err.message || 'Ocurrió un error al guardar el contacto.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación
  const handleOpenDelete = (contacto) => {
    setContactoToDelete(contacto);
    setIsDeleteOpen(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setContactoToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!contactoToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiService.deleteContacto(contactoToDelete.id_contacto);
      setSuccessMessage(`Contacto "${contactoToDelete.nombre}" eliminado correctamente.`);
      setIsDeleteOpen(false);
      setContactoToDelete(null);
      await fetchContactos();
    } catch (err) {
      console.error('Error al eliminar contacto:', err);
      if (err.status === 409) {
        setError('No se puede eliminar el contacto porque tiene oportunidades comerciales asociadas.');
      } else {
        setError(err.message || 'Error al eliminar el contacto.');
      }
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado de contactos
  const filteredContactos = contactos.filter(con => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      con.nombre?.toLowerCase().includes(term) ||
      con.correo?.toLowerCase().includes(term) ||
      con.cargo?.toLowerCase().includes(term) ||
      con.empresa?.nombre?.toLowerCase().includes(term) ||
      con.telefono?.includes(searchTerm);

    const matchEmpresa =
      filterEmpresa === 'ALL' ||
      String(con.id_empresa) === String(filterEmpresa);

    return matchSearch && matchEmpresa;
  });

  return (
    <div className="module-view contactos-view">
      {/* Encabezado del Módulo */}
      <div className="view-header">
        <div className="view-title-group">
          <div className="title-with-icon">
            <span className="page-icon">👥</span>
            <h2>Contactos</h2>
          </div>
          <p className="view-subtitle">
            Directorio de ejecutivos y tomadores de decisiones vinculados a empresas cliente
          </p>
        </div>

        <div className="view-actions">
          <button
            type="button"
            className="btn btn-primary btn-with-icon"
            onClick={handleOpenCreate}
            id="btn-nuevo-contacto"
          >
            <span className="btn-icon">+</span>
            Nuevo contacto
          </button>
        </div>
      </div>

      {/* Alertas de éxito y error */}
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

      {/* Advertencia si no hay empresas cargadas */}
      {!loadingEmpresas && empresas.length === 0 && (
        <div className="alert alert-danger" role="alert" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
          <span className="alert-icon">ℹ️</span>
          <div className="alert-content">
            <strong>Aviso de configuración:</strong> No existen empresas registradas en el CRM. Para poder vincular contactos, primero debe registrar una Empresa Cliente.
            {onNavigateToEmpresas && (
              <span style={{ marginLeft: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onNavigateToEmpresas}
                  style={{ display: 'inline-flex', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Ir al catálogo de Empresas &rarr;
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Barra de herramientas / Búsqueda y filtrado */}
      <div className="table-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, correo, cargo o empresa..."
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
          <label htmlFor="filter-empresa" className="filter-label">Empresa:</label>
          <select
            id="filter-empresa"
            className="filter-select"
            value={filterEmpresa}
            onChange={(e) => setFilterEmpresa(e.target.value)}
          >
            <option value="ALL">Todas las empresas ({empresas.length})</option>
            {empresas.map(emp => (
              <option key={emp.id_empresa} value={emp.id_empresa}>
                {emp.nombre}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-secondary btn-icon-only"
            title="Recargar listado"
            onClick={() => { fetchEmpresas(); fetchContactos(); }}
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
          <p>Consultando directorio de contactos...</p>
        </div>
      ) : contactos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No hay contactos registrados</h3>
          <p>
            Agregue los ejecutivos, tomadores de decisiones o puntos de contacto clave de sus empresas cliente.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreate}
            disabled={empresas.length === 0}
          >
            + Registrar primer contacto
          </button>
        </div>
      ) : filteredContactos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>Sin coincidencias</h3>
          <p>
            No se encontraron contactos que coincidan con &ldquo;{searchTerm}&rdquo; o el filtro seleccionado.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setSearchTerm(''); setFilterEmpresa('ALL'); }}
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
                <th>Nombre del Contacto</th>
                <th>Cargo / Puesto</th>
                <th>Empresa Asociada</th>
                <th>Datos de Contacto</th>
                <th style={{ width: '150px' }}>Fecha Registro</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredContactos.map((con) => (
                <tr key={con.id_contacto} className="table-row">
                  <td className="cell-id">#{con.id_contacto}</td>
                  <td className="cell-name">
                    <span className="emp-name">{con.nombre}</span>
                  </td>
                  <td className="cell-sector">
                    {con.cargo ? (
                      <span className="sector-tag">{con.cargo}</span>
                    ) : (
                      <span className="text-muted-cell">—</span>
                    )}
                  </td>
                  <td className="cell-company">
                    <div className="company-badge-box">
                      <span className="company-icon">🏢</span>
                      <div>
                        <strong className="company-name-text">
                          {con.empresa?.nombre || `Empresa #${con.id_empresa}`}
                        </strong>
                        {con.empresa?.sector && (
                          <span className="company-sub-text">{con.empresa.sector}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="cell-contact">
                    <div className="contact-info">
                      <a href={`mailto:${con.correo}`} className="contact-link" title="Enviar correo">
                        ✉️ {con.correo}
                      </a>
                      {con.telefono && (
                        <span className="contact-phone" title="Teléfono">
                          📞 {con.telefono}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="cell-date">
                    {con.fecha_registro
                      ? new Date(con.fecha_registro).toLocaleDateString(undefined, {
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
                        title="Editar contacto"
                        onClick={() => handleOpenEdit(con)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-delete"
                        title="Eliminar contacto"
                        onClick={() => handleOpenDelete(con)}
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
            Mostrando <strong>{filteredContactos.length}</strong> de <strong>{contactos.length}</strong> contactos registrados
          </div>
        </div>
      )}

      {/* Modal Formulario Contacto */}
      <ContactoFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveContacto}
        contactoToEdit={contactoToEdit}
        isSubmitting={isSubmitting}
        empresas={empresas}
        onNavigateToEmpresas={onNavigateToEmpresas}
      />

      {/* Modal Confirmar Eliminación Reutilizado */}
      <ConfirmDeleteModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        item={contactoToDelete}
        isDeleting={isDeleting}
        title="Confirmar Eliminación de Contacto"
        entityName="contacto"
        idField="id_contacto"
      />
    </div>
  );
}

