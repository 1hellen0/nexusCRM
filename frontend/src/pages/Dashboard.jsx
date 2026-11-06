import React from 'react';

export default function Dashboard({ apiState, activeTab }) {
  const isConnected = !apiState.loading && !apiState.error && apiState.data?.status === 'OK';

  return (
    <div className="dashboard-page">
      <div className="welcome-banner">
        <div className="welcome-content">
          <h2>Panel de Control Comercial</h2>
          <p>
            Plataforma B2B para la administración integral del ciclo comercial, gestión de prospectos corporativos,
            seguimiento de contactos clave y avance de oportunidades.
          </p>
        </div>
        <div className="backend-info-chip">
          <span className="chip-label">Backend Express 5 + Sequelize 6:</span>
          <span className={`chip-value ${isConnected ? 'chip-ok' : 'chip-fail'}`}>
            {isConnected ? 'En Línea (3000)' : 'Sin Conexión'}
          </span>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="card module-card">
          <div className="module-header">
            <span className="module-icon">🏢</span>
            <div>
              <h3>Empresas Clientes</h3>
              <span className="module-tag">Directorio B2B</span>
            </div>
          </div>
          <p className="module-desc">
            Gestión de cuentas corporativas, sectores industriales y estados de prospección.
          </p>
          <div className="module-footer">
            <span className="badge-available">API Lista: /api/empresas</span>
          </div>
        </div>

        <div className="card module-card">
          <div className="module-header">
            <span className="module-icon">👥</span>
            <div>
              <h3>Contactos Clave</h3>
              <span className="module-tag">Relaciones</span>
            </div>
          </div>
          <p className="module-desc">
            Directorio de ejecutivos y tomadores de decisiones vinculados a cada empresa cliente.
          </p>
          <div className="module-footer">
            <span className="badge-available">API Lista: /api/contactos</span>
          </div>
        </div>

        <div className="card module-card">
          <div className="module-header">
            <span className="module-icon">🎯</span>
            <div>
              <h3>Oportunidades</h3>
              <span className="module-tag">Pipeline Comercial</span>
            </div>
          </div>
          <p className="module-desc">
            Seguimiento de etapas de negociación, montos proyectados e integridad referencial compuesta.
          </p>
          <div className="module-footer">
            <span className="badge-available">API Lista: /api/oportunidades</span>
          </div>
        </div>

        <div className="card module-card">
          <div className="module-header">
            <span className="module-icon">📅</span>
            <div>
              <h3>Seguimiento</h3>
              <span className="module-tag">Actividades</span>
            </div>
          </div>
          <p className="module-desc">
            Registro de llamadas, reuniones y correos vinculados al pipeline comercial.
          </p>
          <div className="module-footer">
            <span className="badge-available">API Lista: /api/actividades</span>
          </div>
        </div>
      </div>

      <div className="card health-detail-card">
        <h3>Diagnóstico de Infraestructura y Conexión</h3>
        {apiState.loading && (
          <div className="health-loading">
            <div className="spinner"></div>
            <span>Verificando conectividad con <code>GET /api/health</code>...</span>
          </div>
        )}

        {apiState.error && (
          <div className="health-error-box">
            <h4>Error al conectar con el backend</h4>
            <p>{apiState.error.message || 'Verifica que el servidor Express esté en ejecución en el puerto 3000.'}</p>
            <p className="hint">Comando para iniciar backend: <code>npm run dev</code></p>
          </div>
        )}

        {isConnected && (
          <div className="health-success-box">
            <div className="health-row">
              <span className="health-label">Servicio:</span>
              <span className="health-val">{apiState.data.service}</span>
            </div>
            <div className="health-row">
              <span className="health-label">Estado de la API:</span>
              <span className="health-val text-success">{apiState.data.status}</span>
            </div>
            <div className="health-row">
              <span className="health-label">Conexión a MySQL:</span>
              <span className="health-val text-success">
                {apiState.data.database === 'connected' ? 'Activa y verificada' : apiState.data.database}
              </span>
            </div>
            <div className="health-row">
              <span className="health-label">Proxy de desarrollo:</span>
              <span className="health-val">Vite <code>/api</code> &rarr; <code>http://127.0.0.1:3000</code></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

