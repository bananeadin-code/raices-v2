import { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  vacio?: string;
}

// Tabla reutilizable para todos los módulos.
export function DataTable<T extends { id: number }>({
  columns, rows, onEdit, onDelete, vacio = 'Sin registros',
}: Props<T>) {
  if (rows.length === 0) return <p className="vacio">{vacio}</p>;
  const conAcciones = Boolean(onEdit || onDelete);
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((c) => <th key={c.header}>{c.header}</th>)}
          {conAcciones && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => <td key={c.header}>{c.render(row)}</td>)}
            {conAcciones && (
              <td>
                {onEdit && <button className="btn-ghost btn-sm" onClick={() => onEdit(row)}>Editar</button>}
                {onDelete && <button className="btn-danger btn-sm" onClick={() => onDelete(row)}>Eliminar</button>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
