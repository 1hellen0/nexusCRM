import React from 'react';

const NAV_ITEMS = [
  { id: 'detalles-cotizacion', label: 'Detalles de Cotización', icon: '📋', count: 'Ventas' },
  { id: 'contratos', label: 'Contratos', icon: '📄', count: 'Ventas' },
  { id: 'facturas', label: 'Facturas', icon: '🧾', count: 'Ventas' },
  { id: 'detalles-factura', label: 'Detalles de Factura', icon: '🧾', count: 'Ventas' },
  { id: 'pagos', label: 'Pagos', icon: '💳', count: 'Ventas' },
  { id: 'direcciones-empresa', label: 'Direcciones de Empresa', icon: '📍', count: 'Empresas' },
  { id: 'cotizaciones', label: 'Cotizaciones', icon: '🧾', count: 'Ventas' },
  { id: 'campanas-marketing', label: 'Campañas', icon: '📣', count: 'Marketing' },
  { id: 'productos-servicios', label: 'Productos y Servicios', icon: '📦', count: 'Catálogo' },
  { id: 'categorias-producto', label: 'Categorías', icon: '🗂️', count: 'Catálogo' },
  { id: 'empleados', label: 'Empleados', icon: '👥', count: 'Equipo' },
  { id: 'departamentos', label: 'Departamentos', icon: '🏢', count: 'Catálogo' },
  { id: 'sectores', label: 'Sectores', icon: '🏷️', count: 'Catálogo' },
  { id: 'dashboard', label: 'Inicio', icon: '📊' },
  { id: 'empresas', label: 'Empresas Clientes', icon: '🏢', count: 'Módulo Activo' },
  { id: 'contactos', label: 'Contactos', icon: '👥', count: 'Módulo Activo' },
  { id: 'oportunidades', label: 'Oportunidades Comerciales', icon: '🎯', count: 'Pipeline' },
  { id: 'actividades', label: 'Actividades de Seguimiento', icon: '📅', count: 'Agenda' }
];

export default function Navbar({ activeTab, onSelectTab }) {
  return (
    <nav className="main-navbar">
      <div className="nav-container">
        <ul className="nav-list">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="nav-item">
                <button
                  type="button"
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.count && (
                    <span className="nav-tag">{item.count}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

