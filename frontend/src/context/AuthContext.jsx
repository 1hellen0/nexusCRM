import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, tokenStorage, setOnUnauthorized } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => tokenStorage.get());
  const [loading, setLoading] = useState(true);

  // Cierre de sesión y limpieza de estado
  const logout = useCallback(() => {
    tokenStorage.remove();
    setToken(null);
    setUser(null);
  }, []);

  // Registrar callback global para cuando api.js reciba un HTTP 401
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // Restaurar y validar la sesión almacenada en el arranque
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = tokenStorage.get();
      if (!storedToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiService.getMe();
        if (isMounted) {
          setUser(response.usuario || response.user || response);
          setToken(storedToken);
        }
      } catch (err) {
        // Token inválido, expirado o error de autenticación
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Función de inicio de sesión
  const login = async (correo, password) => {
    const data = await apiService.login({ correo, password });
    if (data.token) {
      tokenStorage.set(data.token);
      setToken(data.token);
      setUser(data.usuario || null);
    }
    return data;
  };

  // Función de registro de nuevo usuario
  const register = async (nombre, correo, password) => {
    return apiService.register({ nombre, correo, password });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}

export default AuthContext;

