/**
 * NexusCRM — Servicio Centralizado de API
 * Maneja peticiones HTTP hacia el backend Express vía proxy de Vite (/api)
 * Incorpora autenticación JWT con Bearer token y control de sesión
 */

const API_BASE = '/api';
const TOKEN_KEY = 'nexuscrm_token';

// Callbacks para eventos de autorización
let onUnauthorizedCallback = null;

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Error guardando token en localStorage:', e.message);
    }
  },
  remove() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error eliminando token de localStorage:', e.message);
    }
  }
};

export function setOnUnauthorized(callback) {
  onUnauthorizedCallback = callback;
}

/**
 * Convierte un objeto de parámetros en query string URL (ej. ?id_factura=1&estado=Emitida)
 */
function buildQuery(params) {
  if (!params || typeof params !== 'object') return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = tokenStorage.get();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Inyectar automáticamente el Bearer token si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      // Manejo de expiración o invalidez de token (HTTP 401)
      // Excluir el endpoint de login para no disparar logout global ante credenciales erróneas
      if (response.status === 401 && endpoint !== '/auth/login') {
        tokenStorage.remove();
        if (typeof onUnauthorizedCallback === 'function') {
          onUnauthorizedCallback();
        }
      }

      const errorMsg = data?.error || data?.message || `Error HTTP ${response.status}: ${response.statusText}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const networkError = new Error('No se pudo establecer conexión con el servidor backend.');
      networkError.status = 0;
      throw networkError;
    }
    throw err;
  }
}

export const apiService = {
  // Manejo de token
  getToken: tokenStorage.get,
  setToken: tokenStorage.set,
  removeToken: tokenStorage.remove,
  setOnUnauthorized,

  // Autenticación de Usuarios
  async register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMe() {
    return request('/auth/me');
  },

  // Comprobación de salud del sistema
  async checkHealth() {
    return request('/health');
  },

  // ==========================================
  // 1. Métodos del módulo EmpresaCliente
  // ==========================================
  async getEmpresas(params) {
    return request(`/empresas${buildQuery(params)}`);
  },

  async getEmpresa(id) {
    return request(`/empresas/${id}`);
  },

  async createEmpresa(payload) {
    return request('/empresas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateEmpresa(id, payload) {
    return request(`/empresas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteEmpresa(id) {
    return request(`/empresas/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 2. Métodos del módulo Contacto
  // ==========================================
  async getContactos(params) {
    return request(`/contactos${buildQuery(params)}`);
  },

  async getContacto(id) {
    return request(`/contactos/${id}`);
  },

  async createContacto(payload) {
    return request('/contactos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateContacto(id, payload) {
    return request(`/contactos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteContacto(id) {
    return request(`/contactos/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 3. Métodos del módulo OportunidadComercial
  // ==========================================
  async getOportunidades(params) {
    return request(`/oportunidades${buildQuery(params)}`);
  },

  async getOportunidad(id) {
    return request(`/oportunidades/${id}`);
  },

  async createOportunidad(payload) {
    return request('/oportunidades', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateOportunidad(id, payload) {
    return request(`/oportunidades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteOportunidad(id) {
    return request(`/oportunidades/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 4. Métodos del módulo ActividadSeguimiento
  // ==========================================
  async getActividades(params) {
    return request(`/actividades${buildQuery(params)}`);
  },

  async getActividad(id) {
    return request(`/actividades/${id}`);
  },

  async createActividad(payload) {
    return request('/actividades', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateActividad(id, payload) {
    return request(`/actividades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteActividad(id) {
    return request(`/actividades/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 5. Métodos del módulo SectorEmpresarial (/api/sectores)
  // ==========================================
  async getSectores(params) {
    return request(`/sectores${buildQuery(params)}`);
  },

  async getSector(id) {
    return request(`/sectores/${id}`);
  },

  async createSector(payload) {
    return request('/sectores', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateSector(id, payload) {
    return request(`/sectores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteSector(id) {
    return request(`/sectores/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 6. Métodos del módulo Departamento (/api/departamentos)
  // ==========================================
  async getDepartamentos(params) {
    return request(`/departamentos${buildQuery(params)}`);
  },

  async getDepartamento(id) {
    return request(`/departamentos/${id}`);
  },

  async createDepartamento(payload) {
    return request('/departamentos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateDepartamento(id, payload) {
    return request(`/departamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteDepartamento(id) {
    return request(`/departamentos/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 7. Métodos del módulo CategoriaProducto (/api/categorias-producto)
  // ==========================================
  async getCategoriasProducto(params) {
    return request(`/categorias-producto${buildQuery(params)}`);
  },

  async getCategoriaProducto(id) {
    return request(`/categorias-producto/${id}`);
  },

  async createCategoriaProducto(payload) {
    return request('/categorias-producto', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCategoriaProducto(id, payload) {
    return request(`/categorias-producto/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteCategoriaProducto(id) {
    return request(`/categorias-producto/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 8. Métodos del módulo DireccionEmpresa (/api/direcciones-empresa)
  // ==========================================
  async getDireccionesEmpresa(params) {
    return request(`/direcciones-empresa${buildQuery(params)}`);
  },

  async getDireccionEmpresa(id) {
    return request(`/direcciones-empresa/${id}`);
  },

  async createDireccionEmpresa(payload) {
    return request('/direcciones-empresa', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateDireccionEmpresa(id, payload) {
    return request(`/direcciones-empresa/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteDireccionEmpresa(id) {
    return request(`/direcciones-empresa/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 9. Métodos del módulo Empleado (/api/empleados)
  // ==========================================
  async getEmpleados(params) {
    return request(`/empleados${buildQuery(params)}`);
  },

  async getEmpleado(id) {
    return request(`/empleados/${id}`);
  },

  async createEmpleado(payload) {
    return request('/empleados', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateEmpleado(id, payload) {
    return request(`/empleados/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteEmpleado(id) {
    return request(`/empleados/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 10. Métodos del módulo ProductoServicio (/api/productos-servicios)
  // ==========================================
  async getProductosServicios(params) {
    return request(`/productos-servicios${buildQuery(params)}`);
  },

  async getProductoServicio(id) {
    return request(`/productos-servicios/${id}`);
  },

  async createProductoServicio(payload) {
    return request('/productos-servicios', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateProductoServicio(id, payload) {
    return request(`/productos-servicios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteProductoServicio(id) {
    return request(`/productos-servicios/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 11. Métodos del módulo CampañaMarketing (/api/campanas-marketing)
  // ==========================================
  async getCampanasMarketing(params) {
    return request(`/campanas-marketing${buildQuery(params)}`);
  },

  async getCampanaMarketing(id) {
    return request(`/campanas-marketing/${id}`);
  },

  async createCampanaMarketing(payload) {
    return request('/campanas-marketing', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCampanaMarketing(id, payload) {
    return request(`/campanas-marketing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteCampanaMarketing(id) {
    return request(`/campanas-marketing/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 12. Métodos del módulo Cotizacion (/api/cotizaciones)
  // ==========================================
  async getCotizaciones(params) {
    return request(`/cotizaciones${buildQuery(params)}`);
  },

  async getCotizacion(id) {
    return request(`/cotizaciones/${id}`);
  },

  async createCotizacion(payload) {
    return request('/cotizaciones', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCotizacion(id, payload) {
    return request(`/cotizaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteCotizacion(id) {
    return request(`/cotizaciones/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 13. Métodos del módulo DetalleCotizacion (/api/detalles-cotizacion)
  // ==========================================
  async getDetallesCotizacion(params) {
    return request(`/detalles-cotizacion${buildQuery(params)}`);
  },

  async getDetalleCotizacion(id) {
    return request(`/detalles-cotizacion/${id}`);
  },

  async createDetalleCotizacion(payload) {
    return request('/detalles-cotizacion', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateDetalleCotizacion(id, payload) {
    return request(`/detalles-cotizacion/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteDetalleCotizacion(id) {
    return request(`/detalles-cotizacion/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 14. Métodos del módulo Contrato (/api/contratos)
  // ==========================================
  async getContratos(params) {
    return request(`/contratos${buildQuery(params)}`);
  },

  async getContrato(id) {
    return request(`/contratos/${id}`);
  },

  async createContrato(payload) {
    return request('/contratos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateContrato(id, payload) {
    return request(`/contratos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteContrato(id) {
    return request(`/contratos/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 15. Métodos del módulo Factura (/api/facturas)
  // ==========================================
  async getFacturas(params) {
    return request(`/facturas${buildQuery(params)}`);
  },

  async getFactura(id) {
    return request(`/facturas/${id}`);
  },

  async createFactura(payload) {
    return request('/facturas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateFactura(id, payload) {
    return request(`/facturas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteFactura(id) {
    return request(`/facturas/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 16. Métodos del módulo DetalleFactura (/api/detalles-factura)
  // ==========================================
  async getDetallesFactura(params) {
    return request(`/detalles-factura${buildQuery(params)}`);
  },

  async getDetalleFactura(id) {
    return request(`/detalles-factura/${id}`);
  },

  async createDetalleFactura(payload) {
    return request('/detalles-factura', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateDetalleFactura(id, payload) {
    return request(`/detalles-factura/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteDetalleFactura(id) {
    return request(`/detalles-factura/${id}`, {
      method: 'DELETE'
    });
  },

  // ==========================================
  // 17. Métodos del módulo Pago (/api/pagos)
  // ==========================================
  async getPagos(params) {
    return request(`/pagos${buildQuery(params)}`);
  },

  async getPago(id) {
    return request(`/pagos/${id}`);
  },

  async createPago(payload) {
    return request('/pagos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updatePago(id, payload) {
    return request(`/pagos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deletePago(id) {
    return request(`/pagos/${id}`, {
      method: 'DELETE'
    });
  }
};

export default apiService;
