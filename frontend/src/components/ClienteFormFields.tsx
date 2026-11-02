import { Cliente } from '../types';

// Formulario de cliente reutilizable (se usa en la pantalla de Clientes y en el
// alta rápida desde el POS). Renderiza solo los campos; el <Modal> lo pone quien lo use.
export const VACIO_CLIENTE: Partial<Cliente> = { nombre: '', telefono: '', calle: '', ciudad: '', limite_credito: 0 };

// Catálogos SAT (subconjunto común) para agilizar el llenado.
const REGIMENES: [string, string][] = [
  ['601', '601 - General de Ley Personas Morales'],
  ['603', '603 - Personas Morales con Fines no Lucrativos'],
  ['605', '605 - Sueldos y Salarios'],
  ['606', '606 - Arrendamiento'],
  ['612', '612 - Personas Físicas con Actividad Empresarial'],
  ['616', '616 - Sin obligaciones fiscales'],
  ['621', '621 - Incorporación Fiscal'],
  ['626', '626 - Régimen Simplificado de Confianza (RESICO)'],
];
const USOS_CFDI: [string, string][] = [
  ['G01', 'G01 - Adquisición de mercancías'],
  ['G03', 'G03 - Gastos en general'],
  ['I01', 'I01 - Construcciones'],
  ['P01', 'P01 - Por definir'],
  ['S01', 'S01 - Sin efectos fiscales'],
];

export function ClienteFormFields({ form, onChange }: { form: Partial<Cliente>; onChange: (f: Partial<Cliente>) => void }) {
  const set = (campo: keyof Cliente, val: any) => onChange({ ...form, [campo]: val });
  return (
    <>
      <label>Nombre
        <input value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} autoFocus />
      </label>
      <label>Teléfono
        <input value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} />
      </label>
      <label>Correo
        <input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
      </label>
      <label>Domicilio
        <input value={form.calle ?? ''} onChange={(e) => set('calle', e.target.value)} placeholder="Calle y número, colonia..." />
      </label>
      <label>Ciudad
        <input value={form.ciudad ?? ''} onChange={(e) => set('ciudad', e.target.value)} />
      </label>
      <label>Límite de crédito
        <input type="number" value={form.limite_credito ?? 0} onChange={(e) => set('limite_credito', Number(e.target.value))} />
      </label>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ink-500)' }}>
          Datos fiscales (opcional)
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
          Solo para agilizar la factura si el cliente la solicita por fuera.
        </div>
      </div>
      <label>RFC
        <input value={form.rfc ?? ''} onChange={(e) => set('rfc', e.target.value.toUpperCase())} />
      </label>
      <label>Razón social
        <input value={form.razon_social ?? ''} onChange={(e) => set('razon_social', e.target.value)} />
      </label>
      <label>Régimen fiscal
        <select value={form.regimen_fiscal ?? ''} onChange={(e) => set('regimen_fiscal', e.target.value || null)}>
          <option value="">— Sin especificar —</option>
          {REGIMENES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <label>Uso de CFDI
        <select value={form.uso_cfdi ?? ''} onChange={(e) => set('uso_cfdi', e.target.value || null)}>
          <option value="">— Sin especificar —</option>
          {USOS_CFDI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <label>Código postal fiscal
        <input value={form.cp_fiscal ?? ''} onChange={(e) => set('cp_fiscal', e.target.value)} />
      </label>
      <label>Correo para facturas
        <input value={form.email_fiscal ?? ''} onChange={(e) => set('email_fiscal', e.target.value)} />
      </label>
    </>
  );
}
