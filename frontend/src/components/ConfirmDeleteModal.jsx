import React from 'react';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  isDeleting,
  title = 'Confirmar Eliminación',
  entityName = 'empresa',
  idField,
  confirmMessage,
  warningNote
}) {
  if (!isOpen || !item) return null;

  const id = idField ? item[idField] : (item.id_empresa || item.id_contacto || item.id);
  const defaultArticle = entityName === 'empresa' ? 'la empresa' : 'el contacto';
  const defaultWarning = entityName === 'empresa'
    ? 'Nota: Si la empresa cuenta con contactos u oportunidades comerciales asociadas, la base de datos rechazará la operación por integridad referencial (HTTP 409).'
    : 'Nota: Si el contacto tiene oportunidades comerciales vinculadas como contacto principal, la base de datos rechazará la eliminación por integridad referencial (HTTP 409).';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
      <div className="modal-dialog modal-dialog-sm">
        <div className="modal-header modal-header-danger">
          <div className="modal-danger-icon">⚠️</div>
          <div>
            <h3 id="confirm-delete-title" className="modal-title">{title}</h3>
            <p className="modal-subtitle">Esta acción es irreversible</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p className="confirm-text">
            {confirmMessage || (
              <>
                ¿Está seguro de que desea eliminar {defaultArticle} <strong>&ldquo;{item.nombre}&rdquo;</strong> (ID: #{id})?
              </>
            )}
          </p>
          <div className="delete-warning-note">
            {warningNote || defaultWarning}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner-inline"></span>
                Eliminando...
              </>
            ) : (
              `Sí, Eliminar ${entityName.charAt(0).toUpperCase() + entityName.slice(1)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
