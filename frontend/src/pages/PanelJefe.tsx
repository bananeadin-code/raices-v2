import { useEffect, useState, FormEvent, ReactNode } from 'react';

// ------- API propia del panel (token separado del sistema operativo) -------
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const TKEY = 'jefe_token';

async function jefeApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TKEY);
  const res = await fetch(`${BASE}/jefe${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) localStorage.removeItem(TKEY);
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `Error ${res.status}`); }
  return res.status === 204 ? (undefined as T) : res.json();
}

const money = (n: number) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const money2 = (n: number) => Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

interface Reporte {
  resumen: {
    ventasHoy: { n: number; monto: number };
    ventasMes: { n: number; monto: number };
    carteraPorCobrar: number; ventasPendientes: number; valorInventario: number;
    produccionActiva: number; clientesActivos: number; articulosBajoMinimo: number;
  };
  ventasPorDia: { dia: string; monto: number; n: number }[];
  topArticulos: { nombre: string; unidades: number; monto: number }[];
  ventasPorSucursal: { nombre: string; monto: number; n: number }[];
  ventasPorMetodo: { metodo: string; monto: number; n: number }[];
  cobranza: { total: number; vencido: number; porVencer: number };
  bajoMinimo: { articulo: string; sucursal: string; minimo: number; disponible: number }[];
  produccionPorEstado: { estado: string; n: number }[];
}

const METODO_LABEL: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', credito: 'Crédito' };
const ESTADO_PROD: Record<string, string> = { en_espera: 'En espera', en_progreso: 'En progreso', terminado: 'Terminado', cancelado: 'Cancelado' };

export function PanelJefe() {
  const [usuario, setUsuario] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(TKEY)) { setCargando(false); return; }
    jefeApi<{ usuario: string }>('/me').then((r) => setUsuario(r.usuario)).catch(() => {}).finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="jefe-bg"><p style={{ color: '#cbd5e1' }}>Cargando…</p></div>;
  if (!usuario) return <JefeLogin onEntrar={setUsuario} />;
  return <JefeDashboard usuario={usuario} onUsuario={setUsuario} onSalir={() => { localStorage.removeItem(TKEY); setUsuario(null); }} />;
}

// ------------------------------- Login -------------------------------
function JefeLogin({ onEntrar }: { onEntrar: (u: string) => void }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      const r = await jefeApi<{ token: string; usuario: string }>('/login', { method: 'POST', body: JSON.stringify({ usuario, password }) });
      localStorage.setItem(TKEY, r.token); onEntrar(r.usuario);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al entrar'); }
  }
  return (
    <div className="jefe-bg">
      <form className="jefe-login" onSubmit={submit}>
        <div className="jefe-eyebrow">Reportes</div>
        <h1>Panel del Jefe</h1>
        <p className="jefe-sub">Acceso restringido · Raíces Duranguenses</p>
        <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="jefe-error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

// ------------------------------ Dashboard ------------------------------
function JefeDashboard({ usuario, onUsuario, onSalir }: { usuario: string; onUsuario: (u: string) => void; onSalir: () => void }) {
  const [rep, setRep] = useState<Reporte | null>(null);
  const [error, setError] = useState('');
  const [cambiar, setCambiar] = useState(false);

  useEffect(() => {
    jefeApi<Reporte>('/reporte').then(setRep).catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  const maxDia = rep ? Math.max(1, ...rep.ventasPorDia.map((d) => d.monto)) : 1;

  return (
    <div className="jefe-shell">
      <header className="jefe-header">
        <div>
          <div className="jefe-title">Panel del Jefe</div>
          <div className="jefe-usuario">Raíces Duranguenses · {usuario}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="jefe-btn" onClick={() => setCambiar(true)}>Cambiar acceso</button>
          <button className="jefe-btn" onClick={onSalir}>Salir</button>
        </div>
      </header>

      {error && <p className="jefe-error" style={{ padding: 20 }}>{error}</p>}
      {!rep && !error && <p style={{ padding: 24, color: '#64748b' }}>Cargando reporte…</p>}

      {rep && (
        <div className="jefe-body">
          {/* KPIs */}
          <div className="jefe-kpis">
            <Kpi label="Ventas del mes" value={money(rep.resumen.ventasMes.monto)} sub={`${rep.resumen.ventasMes.n} ventas`} destacado />
            <Kpi label="Ventas de hoy" value={money(rep.resumen.ventasHoy.monto)} sub={`${rep.resumen.ventasHoy.n} ventas`} />
            <Kpi label="Por cobrar (cartera)" value={money(rep.resumen.carteraPorCobrar)} sub="crédito con saldo" />
            <Kpi label="Valor de inventario" value={money(rep.resumen.valorInventario)} sub="a costo" />
            <Kpi label="Ventas pendientes" value={String(rep.resumen.ventasPendientes)} sub="apartadas" />
            <Kpi label="Producción activa" value={String(rep.resumen.produccionActiva)} sub="en proceso" />
            <Kpi label="Clientes activos" value={String(rep.resumen.clientesActivos)} />
            <Kpi label="Bajo mínimo" value={String(rep.resumen.articulosBajoMinimo)} sub="artículos" alerta={rep.resumen.articulosBajoMinimo > 0} />
          </div>

          <div className="jefe-grid">
            {/* Ventas últimos 30 días */}
            <Card titulo="Ventas · últimos 30 días" ancho2>
              {rep.ventasPorDia.length === 0 ? <Vacio /> : (
                <div className="jefe-bars">
                  {rep.ventasPorDia.map((d) => (
                    <div key={d.dia} className="jefe-bar-col" title={`${new Date(d.dia).toLocaleDateString('es-MX')} · ${money2(d.monto)} · ${d.n} venta(s)`}>
                      <div className="jefe-bar" style={{ height: `${Math.max(2, (d.monto / maxDia) * 100)}%` }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="jefe-bars-cap"><span>hace 30 días</span><span>hoy</span></div>
            </Card>

            {/* Cobranza */}
            <Card titulo="Cobranza">
              <div className="jefe-cobranza">
                <div><span className="l">Total por cobrar</span><span className="v">{money2(rep.cobranza.total)}</span></div>
                <div><span className="l">Vencido</span><span className="v" style={{ color: '#dc2626' }}>{money2(rep.cobranza.vencido)}</span></div>
                <div><span className="l">Por vencer</span><span className="v">{money2(rep.cobranza.porVencer)}</span></div>
              </div>
            </Card>

            {/* Ventas por método */}
            <Card titulo="Ventas por método de pago">
              <BarList items={rep.ventasPorMetodo.map((m) => ({ label: METODO_LABEL[m.metodo] ?? m.metodo, value: m.monto }))} fmt={money2} />
            </Card>

            {/* Ventas por sucursal */}
            <Card titulo="Ventas por sucursal">
              <BarList items={rep.ventasPorSucursal.map((s) => ({ label: s.nombre, value: s.monto }))} fmt={money2} />
            </Card>

            {/* Top artículos */}
            <Card titulo="Artículos más vendidos">
              {rep.topArticulos.length === 0 ? <Vacio /> : (
                <table className="jefe-tabla">
                  <thead><tr><th>Artículo</th><th>Unid.</th><th>Importe</th></tr></thead>
                  <tbody>
                    {rep.topArticulos.map((a, i) => (
                      <tr key={i}><td>{a.nombre}</td><td>{a.unidades.toLocaleString('es-MX')}</td><td>{money2(a.monto)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Producción por estado */}
            <Card titulo="Producción por estado">
              <BarList items={rep.produccionPorEstado.map((p) => ({ label: ESTADO_PROD[p.estado] ?? p.estado, value: p.n }))} fmt={(n) => String(n)} />
            </Card>

            {/* Bajo mínimo */}
            <Card titulo="Inventario bajo mínimo" ancho2>
              {rep.bajoMinimo.length === 0 ? <p className="jefe-ok">Todo el inventario está por encima de su mínimo.</p> : (
                <table className="jefe-tabla">
                  <thead><tr><th>Artículo</th><th>Sucursal</th><th>Mínimo</th><th>Disponible</th></tr></thead>
                  <tbody>
                    {rep.bajoMinimo.map((b, i) => (
                      <tr key={i}><td>{b.articulo}</td><td>{b.sucursal}</td><td>{b.minimo}</td>
                        <td style={{ color: '#dc2626', fontWeight: 700 }}>{b.disponible}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      )}

      {cambiar && <CambiarAcceso onCerrar={() => setCambiar(false)} onCambiado={(u) => { onUsuario(u); setCambiar(false); }} />}
    </div>
  );
}

function Kpi({ label, value, sub, destacado, alerta }: { label: string; value: string; sub?: string; destacado?: boolean; alerta?: boolean }) {
  return (
    <div className={`jefe-kpi${destacado ? ' destacado' : ''}${alerta ? ' alerta' : ''}`}>
      <span className="jefe-kpi-label">{label}</span>
      <span className="jefe-kpi-value">{value}</span>
      {sub && <span className="jefe-kpi-sub">{sub}</span>}
    </div>
  );
}

function Card({ titulo, children, ancho2 }: { titulo: string; children: ReactNode; ancho2?: boolean }) {
  return (
    <div className={`jefe-card${ancho2 ? ' ancho2' : ''}`}>
      <div className="jefe-card-title">{titulo}</div>
      {children}
    </div>
  );
}

function Vacio() { return <p style={{ color: '#94a3b8', fontSize: 13, margin: '8px 0' }}>Sin datos todavía.</p>; }

function BarList({ items, fmt }: { items: { label: string; value: number }[]; fmt: (n: number) => string }) {
  if (items.length === 0) return <Vacio />;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="jefe-barlist">
      {items.map((it, i) => (
        <div key={i} className="jefe-barlist-row">
          <span className="jefe-barlist-label">{it.label}</span>
          <div className="jefe-barlist-track"><div className="jefe-barlist-fill" style={{ width: `${(it.value / max) * 100}%` }} /></div>
          <span className="jefe-barlist-value">{fmt(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CambiarAcceso({ onCerrar, onCambiado }: { onCerrar: () => void; onCambiado: (u: string) => void }) {
  const [actual, setActual] = useState('');
  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  async function guardar() {
    setError(''); setOk('');
    if (!actual) { setError('Escribe tu contraseña actual.'); return; }
    if (!nuevoUsuario.trim() && !nuevaPassword) { setError('Indica un nuevo usuario o una nueva contraseña.'); return; }
    try {
      const r = await jefeApi<{ usuario: string }>('/credenciales', {
        method: 'PUT',
        body: JSON.stringify({ password_actual: actual, nuevo_usuario: nuevoUsuario.trim() || undefined, nueva_password: nuevaPassword || undefined }),
      });
      setOk('Acceso actualizado.'); setTimeout(() => onCambiado(r.usuario), 700);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar'); }
  }
  return (
    <div className="jefe-modal-overlay">
      <div className="jefe-modal">
        <h3>Cambiar acceso</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>Confirma tu contraseña actual y define los datos nuevos.</p>
        <label>Contraseña actual
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
        </label>
        <label>Nuevo usuario (opcional)
          <input value={nuevoUsuario} onChange={(e) => setNuevoUsuario(e.target.value)} placeholder="dejar vacío para no cambiar" />
        </label>
        <label>Nueva contraseña (opcional, mín. 6)
          <input type="password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} placeholder="dejar vacío para no cambiar" />
        </label>
        {error && <p className="jefe-error">{error}</p>}
        {ok && <p style={{ color: '#16a34a', fontSize: 13 }}>{ok}</p>}
        <div className="jefe-modal-actions">
          <button className="jefe-btn" onClick={onCerrar}>Cancelar</button>
          <button className="jefe-btn primario" onClick={guardar}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
