import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icon';

interface MenuItem { to: string; label: string; permiso: string; icon: string; }
interface MenuGrupo { titulo: string; items: MenuItem[]; }

// El menú se filtra por permisos: el rol operativo ve captura,
// el rol admin ve además reportes/usuarios. Un solo sistema, dos vistas.
const MENU: MenuGrupo[] = [
  {
    titulo: 'Operativo',
    items: [
      { to: '/pos', label: 'Punto de Venta', permiso: 'pos:ver', icon: 'cart' },
      { to: '/remisiones', label: 'Remisiones', permiso: 'remisiones:ver', icon: 'file' },
      { to: '/cobranza', label: 'Cobranza', permiso: 'cobranza:ver', icon: 'cash' },
      { to: '/abonos', label: 'Abonos', permiso: 'abonos:ver', icon: 'card' },
      { to: '/produccion', label: 'Producción', permiso: 'produccion:ver', icon: 'settings' },
      { to: '/tareas', label: 'Tareas', permiso: 'tareas:ver', icon: 'clipboard' },
    ],
  },
  {
    titulo: 'Inventario',
    items: [
      { to: '/inventario/articulos', label: 'Artículos (stock)', permiso: 'inventario:ver', icon: 'box' },
      { to: '/inventario/materiales', label: 'Materiales (stock)', permiso: 'inventario:ver', icon: 'layers' },
    ],
  },
  {
    titulo: 'Catálogos',
    items: [
      { to: '/clientes', label: 'Clientes', permiso: 'clientes:ver', icon: 'user' },
      { to: '/articulos', label: 'Artículos', permiso: 'articulos:ver', icon: 'tag' },
      { to: '/materias', label: 'Materias Primas', permiso: 'materias:ver', icon: 'layers' },
      { to: '/categorias', label: 'Categorías', permiso: 'categorias:ver', icon: 'folder' },
      { to: '/garantias', label: 'Garantías', permiso: 'garantias:ver', icon: 'file' },
      { to: '/vehiculos', label: 'Vehículos', permiso: 'vehiculos:ver', icon: 'truck' },
      { to: '/sucursales', label: 'Sucursales', permiso: 'sucursales:ver', icon: 'building' },
      { to: '/usuarios', label: 'Usuarios', permiso: 'usuarios:ver', icon: 'users' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { to: '/reportes', label: 'Reportes', permiso: 'reportes:ver', icon: 'chart' },
      { to: '/roles', label: 'Roles y Permisos', permiso: 'roles:ver', icon: 'shield' },
      { to: '/bitacora', label: 'Bitácora', permiso: 'bitacora:ver', icon: 'file' },
      { to: '/supervision', label: 'Supervisión', permiso: 'supervision:ver', icon: 'eye' },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, logout, puede } = useAuth();
  const loc = useLocation();
  const iniciales = (usuario?.usuario ?? '?').slice(0, 2).toUpperCase();
  const activo = MENU.flatMap((g) => g.items).find((m) => m.to === loc.pathname);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <div className="brand-name">Raíces Duranguenses</div>
            <div className="brand-sub">Sistema administrativo</div>
          </div>
        </div>
        <nav>
          {MENU.map((grupo) => {
            const visibles = grupo.items.filter((m) => puede(m.permiso));
            if (visibles.length === 0) return null;
            return (
              <div key={grupo.titulo} className="menu-grupo">
                <span className="menu-titulo">{grupo.titulo}</span>
                {visibles.map((m) => (
                  <Link key={m.to} to={m.to} className={loc.pathname === m.to ? 'activo' : ''}>
                    <Icon name={m.icon} size={18} />
                    <span>{m.label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="main">
        <header>
          <div className="topbar-title">{activo?.label ?? 'Panel'}</div>
          <div className="topbar-right">
            <div className="user-chip">
              <div className="avatar">{iniciales}</div>
              <div className="user-meta">
                <span className="user-name">{usuario?.usuario}</span>
                <span className="user-role">{usuario?.rol}</span>
              </div>
            </div>
            <button className="btn-ghost" onClick={logout} aria-label="Cerrar sesión">
              <Icon name="logout" size={18} /> Salir
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
