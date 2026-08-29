import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';
import { Usuario } from '../types';

interface AuthState {
  usuario: Usuario | null;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
  puede: (permiso: string) => boolean;
  cargando: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setCargando(false); return; }
    api.get<{ usuario: Usuario }>('/auth/me')
      .then((r) => setUsuario(r.usuario))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setCargando(false));
  }, []);

  async function login(u: string, password: string) {
    const r = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { usuario: u, password });
    localStorage.setItem('token', r.token);
    setUsuario(r.usuario);
  }

  function logout() {
    localStorage.removeItem('token');
    setUsuario(null);
  }

  const puede = (permiso: string) => usuario?.permisos.includes(permiso) ?? false;

  return (
    <AuthContext.Provider value={{ usuario, login, logout, puede, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
