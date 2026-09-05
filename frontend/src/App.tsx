import { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { TopLoader } from './components/TopLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './layout/Layout';
import { Login } from './pages/Login';
import { Clientes } from './pages/Clientes';
import { Categorias } from './pages/Categorias';
import { Articulos } from './pages/Articulos';
import { Materias } from './pages/Materias';
import { Sucursales } from './pages/Sucursales';
import { Usuarios } from './pages/Usuarios';
import { Roles } from './pages/Roles';
import { Inventario } from './pages/Inventario';
import { Produccion } from './pages/Produccion';
import { Garantias } from './pages/Garantias';
import { POS } from './pages/POS';
import { Cobranza } from './pages/Cobranza';
import { Abonos } from './pages/Abonos';
import { Remisiones } from './pages/Remisiones';
import { Bitacora } from './pages/Bitacora';
import { EnConstruccion } from './pages/EnConstruccion';

function Privado({ children }: { children: ReactElement }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p style={{ padding: 24 }}>Cargando...</p>;
  return usuario ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <TopLoader />
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <Privado>
                <Layout>
                  <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Navigate to="/clientes" replace />} />

                    {/* Catálogos (construidos) */}
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/articulos" element={<Articulos />} />
                    <Route path="/materias" element={<Materias />} />
                    <Route path="/garantias" element={<Garantias />} />
                    <Route path="/sucursales" element={<Sucursales />} />

                    {/* Acceso (construidos) */}
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/roles" element={<Roles />} />

                    {/* Operativo */}
                    <Route path="/pos" element={<POS />} />
                    <Route path="/remisiones" element={<Remisiones />} />
                    <Route path="/cobranza" element={<Cobranza />} />
                    <Route path="/abonos" element={<Abonos />} />
                    <Route path="/produccion" element={<Produccion />} />
                    <Route path="/tareas" element={<EnConstruccion nombre="Tareas" />} />

                    {/* Inventario */}
                    <Route path="/inventario/articulos" element={<Inventario tipo="articulo" />} />
                    <Route path="/inventario/materiales" element={<Inventario tipo="materia" />} />

                    {/* Administración (por construir) */}
                    <Route path="/reportes" element={<EnConstruccion nombre="Reportes" />} />
                    <Route path="/bitacora" element={<Bitacora />} />
                    <Route path="/supervision" element={<EnConstruccion nombre="Supervisión" />} />
                  </Routes>
                  </ErrorBoundary>
                </Layout>
              </Privado>
            }
          />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
