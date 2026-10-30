export default function CarFilter({ valor, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="filtro-marca" className="text-sm font-medium text-slate-700">
        Filtrar por marca
      </label>
      <input
        id="filtro-marca"
        type="search"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex.: Toyota"
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}
