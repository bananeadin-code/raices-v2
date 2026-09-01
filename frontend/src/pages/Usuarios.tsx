import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { UsuarioRow, Rol, Sucursal } from '../types';
import { DataTable, Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Combobox } from '../components/Combobox';
import { SearchBar } from '../components/SearchBar';
import { Pager } from '../components/Pager';
import { usePagedList } from '../hooks/usePagedList';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

type Form = Partial<UsuarioRow> & { password?: string };
const VACIO: Form = { usuario: '', nombre: '', password: '' };

export function Usuarios() {
  const { puede } = useAuth();
  const toast = useToast();
  const [inactivos, setInactivos] = useState(false);
  const { data: rows, total, page, setPage, buscar, pageSize, reload } =
    usePagedList<UsuarioRow>(inactivos ? '/usuarios?inactivos=1' : '/usuarios');
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Form>(VACIO);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Rol[]>('/roles').then(setRoles).catch(() => {});
    api.getAll<Sucursal>('/sucursales').then(setSucursales).catch(() => {});
  }, []);

  function nuevo() { setError(''); setForm(VACIO); setModal(true); }
  function editar(u: UsuarioRow) { setError(''); setForm({ ...u, password: '' }); setModal(true); }

  async function guardar() {
    setError('');
    const payload: any = {
      usuario: form.usuario,
      nombre: form.nombre,
      apellidos: form.apellidos || null,
      email: form.email || null,
      telefono: form.telefono || null,
      rol_id: form.rol_id,
      sucursal_id: form.sucursal_id ?? null,
    };
    if (form.password) payload.password = form.password;
    try {
      if (form.id) await api.put(`/usuarios/${form.id}`, payload);
      else await api.post('/usuarios', payload);
      setModal(false); await reload(); toast.exito('Guardado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  }
  async function eliminar(u: UsuarioRow) {
    if (!confirm(`¿Desactivar a ${u.nombre}?`)) return;
    try {
      await api.del(`/usuarios/${u.id}`); await reload(); toast.exito('Usuario desactivado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo desactivar');
    }
  }
  async function reactivar(u: UsuarioRow) {
    try { await api.put(`/usuarios/${u.id}/reactivar`, {}); await reload(); toast.exito('Usuario reactivado'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo reactivar'); }
  }

  const columns: Column<UsuarioRow>[] = [
    { header: 'Usuario', render: (u) => u.usuario },
    { header: 'Nombre', render: (u) => `${u.nombre} ${u.apellidos ?? ''}`.trim() },
    { header: 'Rol', render: (u) => u.rol ?? '' },
    { header: 'Sucursal', render: (u) => u.sucursal ?? '' },
    ...(inactivos
      ? [{
          header: 'Acciones',
          render: (u: UsuarioRow) => (puede('usuarios:editar')
            ? <button className="btn-sm btn-primary" onClick={() => reactivar(u)}>Reactivar</button> : null),
        }]
      : []),
  ];

  return (
    <section>
      <div className="page-head">
        <h1>Usuarios</h1>
        {puede('usuarios:crear') && <button className="primario" onClick={nuevo}>Agregar</button>}
      </div>
      <div className="list-toolbar">
        <SearchBar onBuscar={buscar} placeholder="Buscar usuario..." />
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} style={{ width: 'auto' }} />
          Ver inactivos
        </label>
      </div>
      <DataTable columns={columns} rows={rows}
        onEdit={!inactivos && puede('usuarios:editar') ? editar : undefined}
        onDelete={!inactivos && puede('usuarios:eliminar') ? eliminar : undefined} />
      <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} />

      <Modal abierto={modal} titulo={form.id ? 'Editar usuario' : 'Nuevo usuario'}
        onCerrar={() => setModal(false)} onGuardar={guardar}>
        <label>Usuario
          <input value={form.usuario ?? ''} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
        </label>
        <label>Nombre
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>Apellidos
          <input value={form.apellidos ?? ''} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
        </label>
        <label>Correo
          <input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Teléfono
          <input value={form.telefono ?? ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </label>
        <label>{form.id ? 'Contraseña (dejar vacía para no cambiar)' : 'Contraseña'}
          <input type="password" autoComplete="new-password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label>Rol
          <Combobox
            opciones={roles.map((r) => ({ value: r.id, label: r.nombre }))}
            value={form.rol_id ?? ''}
            onChange={(v) => setForm({ ...form, rol_id: v === '' ? undefined : Number(v) })}
            placeholder="Selecciona rol" />
        </label>
        <label>Sucursal
          <Combobox
            opciones={sucursales.map((s) => ({ value: s.id, label: s.nombre }))}
            value={form.sucursal_id ?? ''}
            onChange={(v) => setForm({ ...form, sucursal_id: v === '' ? null : Number(v) })}
            vacioLabel="— Sin asignar —" placeholder="Selecciona sucursal" />
        </label>
        {error && <p className="error">{error}</p>}
      </Modal>
    </section>
  );
}
