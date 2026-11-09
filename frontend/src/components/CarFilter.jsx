import { useState } from "react";

/** Busca pela marca no backend (GET /cars?marca=...), que compara a marca exata. */
export default function CarFilter({ onFiltrar }) {
  const [valor, setValor] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onFiltrar(valor.trim());
  }

  function handleLimpar() {
    setValor("");
    onFiltrar("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2"
      aria-label="Filtrar carros"
    >
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="filtro-marca" className="text-sm font-medium text-slate-700">
          Filtrar por marca
        </label>
        <input
          id="filtro-marca"
          type="search"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder="Marca exata, ex.: Toyota"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700"
      >
        Buscar
      </button>
      <button
        type="button"
        onClick={handleLimpar}
        className="rounded-md px-4 py-2 font-medium text-slate-600 hover:bg-slate-200"
      >
        Limpar
      </button>
    </form>
  );
}
