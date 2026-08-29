// Marcador de posición para los módulos que se construirán en fases posteriores.
export function EnConstruccion({ nombre }: { nombre: string }) {
  return (
    <section>
      <div className="page-head"><h1>{nombre}</h1></div>
      <p className="vacio">Este módulo se construirá en una fase posterior.</p>
    </section>
  );
}
