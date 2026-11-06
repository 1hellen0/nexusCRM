import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Empresas from './pages/Empresas';
import Sectores from './pages/Sectores';
import Departamentos from './pages/Departamentos';
import Empleados from './pages/Empleados';
import CategoriasProducto from './pages/CategoriasProducto';
import ProductosServicios from './pages/ProductosServicios';
import CampanasMarketing from './pages/CampanasMarketing';
import Cotizaciones from './pages/Cotizaciones';
import DetallesCotizacion from './pages/DetallesCotizacion';
import Contratos from './pages/Contratos';
import Facturas from './pages/Facturas';
import DetallesFactura from './pages/DetallesFactura';
import Pagos from './pages/Pagos';
import DireccionesEmpresa from './pages/DireccionesEmpresa';
import Contactos from './pages/Contactos';
import Oportunidades from './pages/Oportunidades';
import Actividades from './pages/Actividades';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiService } from './services/api';

function MainApp() {
  const { user, token, loading, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [loginNotice, setLoginNotice] = useState(null);

  const [apiState, setApiState] = useState({
    loading: true,
    data: null,
    error: null
  });

  const checkHealth = useCallback(async () => {
    setApiState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiService.checkHealth();
      setApiState({
        loading: false,
        data,
        error: null
      });
    } catch (err) {
      setApiState({
        loading: false,
        data: null,
        error: err
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleNavigateToLogin = (noticeMessage = null) => {
    setLoginNotice(noticeMessage);
    setAuthView('login');
  };

  const handleNavigateToRegister = () => {
    setLoginNotice(null);
    setAuthView('register');
  };

  // 1. Estado de carga inicial mientras se verifica el token existente
  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="brand-icon mb-3">💼</div>
          <div className="spinner"></div>
          <p className="loading-text mt-3">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  // 2. Vista de autenticación para usuarios sin sesión
  if (!isAuthenticated) {
    return (
      <div className="app-layout">
        <Header apiState={apiState} onRetryHealth={checkHealth} user={null} onLogout={null} />
        <main className="main-content auth-main">
          {authView === 'login' ? (
            <Login
              onNavigateToRegister={handleNavigateToRegister}
              initialMessage={loginNotice}
            />
          ) : (
            <Register
              onNavigateToLogin={handleNavigateToLogin}
            />
          )}
        </main>
        <footer className="app-footer">
          <p>NexusCRM &copy; {new Date().getFullYear()} &middot; Plataforma Empresarial B2B con Node.js, Express 5, Sequelize 6, MySQL 8 y React 18.</p>
        </footer>
      </div>
    );
  }

  // 3. Vista autenticada: Dashboard y módulos comerciales protegidos
  const renderContent = () => {
    switch (activeTab) {
      case 'empresas':
        return <Empresas />;
      case 'sectores':
        return <Sectores />;
      case 'departamentos':
        return <Departamentos />;
      case 'empleados':
        return <Empleados />;
      case 'categorias-producto':
        return <CategoriasProducto />;
      case 'productos-servicios':
        return <ProductosServicios />;
      case 'campanas-marketing':
        return <CampanasMarketing />;
      case 'cotizaciones':
        return <Cotizaciones />;
      case 'detalles-cotizacion':
        return <DetallesCotizacion />;
      case 'contratos':
        return <Contratos />;
      case 'facturas':
        return <Facturas />;
      case 'detalles-factura':
        return <DetallesFactura />;
      case 'pagos':
        return <Pagos />;
      case 'direcciones-empresa':
        return <DireccionesEmpresa />;
      case 'contactos':
        return <Contactos onNavigateToEmpresas={() => setActiveTab('empresas')} />;
      case 'oportunidades':
        return (
          <Oportunidades
            onNavigateToEmpresas={() => setActiveTab('empresas')}
            onNavigateToContactos={() => setActiveTab('contactos')}
          />
        );
      case 'actividades':
        return <Actividades onNavigateToOportunidades={() => setActiveTab('oportunidades')} />;
      case 'dashboard':
      default:
        return <Dashboard apiState={apiState} activeTab={activeTab} />;
    }
  };

  return (
    <div className="app-layout">
      <Header
        apiState={apiState}
        onRetryHealth={checkHealth}
        user={user}
        onLogout={logout}
      />
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
      <footer className="app-footer">
        <p>NexusCRM &copy; {new Date().getFullYear()} &middot; Plataforma Empresarial B2B con Node.js, Express 5, Sequelize 6, MySQL 8 y React 18.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
