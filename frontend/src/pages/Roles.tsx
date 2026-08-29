import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Rol } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useAuth } from '../auth/AuthContext';

// Módulos del sistema para la matriz de permisos.
const MODULOS = [
  { key: 'pos', label: 'Punto de Venta' },
  { key: 'remisiones', label: 'Remisiones' },
  { key: 'cobranza', label: 'Cobranza' },
  { key: 'abonos', label: 'Abonos' },
  { key: 'produccion', label: 'Producción' },
  { key: 'tareas', label: 'Tareas' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'articulos', label: 'Artículos' },
  { key: 'materias', label: 'Materias Primas' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'vehiculos', label: 'Vehículos' },
  { key: 'sucursales', label: 'Sucursales' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'roles', label: 'Roles' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'supervision', label: 'Supervisión' },
];

type Acciones = { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean };
const ACCIONES: (keyof Acciones)[] = ['ver', 'crear', 'editar', 'eliminar'];

function permisosVacios(): Record<string, Acciones> {
  const m: Record<string, Acciones> = {};
  for (const mod of MODULOS) m[mod.key] = { ver: false, crear: false, editar: false, eliminar: false };
  return m;
}

export function Roles() {
  const { puede } = useAuth();
  const [rows, setRows] = useState<Rol[]>([]);
  const [modalEdit, setModalEdit] = useState(false);
  const [modalPerm, setModalPerm] = useState(false);
  const [form, setForm] = useState<Partial<Rol>>({ nombre: '' });
  const [rolActual, setRolActual] = useState<Rol | null>(null);
  const [permisos, setPermisos] = useState<Record<string, Acciones>>(permisosVacios());
  const [error, setError] = useState('');

  async function cargar() { setRows(await api.get<Rol[]>('/roles')); }
  useEffect(() => { cargar(); }, []);

  function nuevo() { setError(''); setForm({ nombre: '' }); setModalEdit(true); }
  function editar(r: Rol) { setError(''); setForm(r); setModalEdit(true); }
  async function guardar() {
    setError('');
    try {
      if (form.id) await api.put(`/roles/${form.id}`, form);
      else await api.post('/roles', form);
      setModalEdit(false); await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  }
  async function eliminar(r: Rol) {
    if (!confirm(`¿Eliminar el rol "${r.nombre}"?`)) return;
    try {
      await api.del(`/roles/${r.id}`); await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  async function abrirPermisos(r: Rol) {
    const data = await api.get<any[]>(`/roles/${r.id}/permisos`);
    const map = permisosVacios();
    for (const p of data) {
      map[p.modulo] = { ver: !!p.ver, crear: !!p.crear, editar: !!p.editar, eliminar: !!p.eliminar };
    }
    setPermisos(map); setRolActual(r); setModalPerm(true);
  }
  function toggle(modulo: string, accion: keyof Acciones) {
    setPermisos((prev) => ({ ...prev, [modulo]: { ...prev[modulo], [accion]: !prev[modulo][accion] } }));
  }
  async function guardarPermisos() {
    if (!rolActual) return;
    const payload = MODULOS.map((m) => ({ modulo: m.key, ...permisos[m.key] }));
    try {
      await api.put(`/roles/${rolActual.id}/permisos`, payload);
      setModalPerm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudieron guardar los permisos');
    }
  }

  const columns: Column<Rol>[] = [
    { header: 'Rol', render: (r) => r.nombre },
    { header: 'Descripción', render: (r) => r.descripcion ?? '' },
    {
      header: 'Permisos',
      render: (r) => (puede('roles:editar') ? <button onClick={() => abrirPermisos(r)}>Permisos</button> : null),
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Roles y Permisos</h1>
        {puede('roles:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={puede('roles:editar') ? editar : undefined}
        onDelete={puede('roles:eliminar') ? eliminar : undefined} />

      <Modal abierto={modalEdit} titulo={form.id ? 'Editar rol' : 'Nuevo rol'}
        onCerrar={() => setModalEdit(false)} onGuardar={guardar}>
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>Descripción
          <input value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>

      <Modal abierto={modalPerm} titulo={`Permisos · ${rolActual?.nombre ?? ''}`}
        onCerrar={() => setModalPerm(false)} onGuardar={guardarPermisos} ancho={540}>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', width: '100%' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Módulo</th>
                {ACCIONES.map((a) => <th key={a} style={{ textAlign: 'center', textTransform: 'capitalize' }}>{a}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULOS.map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  {ACCIONES.map((a) => (
                    <td key={a} style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={permisos[m.key][a]} onChange={() => toggle(m.key, a)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </section>
  );
}
