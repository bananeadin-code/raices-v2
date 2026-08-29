interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pager({ page, pageSize, total, onPage }: Props) {
  if (total === 0) return null;
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(total, page * pageSize);
  return (
    <div className="pager">
      <span className="pager-info">{desde}–{hasta} de {total}</span>
      <div className="pager-btns">
        <button className="btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
        <span className="pager-page">Página {page} de {paginas}</span>
        <button className="btn-sm" disabled={page >= paginas} onClick={() => onPage(page + 1)}>Siguiente</button>
      </div>
    </div>
  );
}
