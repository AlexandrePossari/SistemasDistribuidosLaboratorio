import { useState } from "react";
import { STATUS_LEITURA } from "../utils/livros.js";

const ABAS = [{ valor: "", rotulo: "Todos" }, ...STATUS_LEITURA];

/** Abas de status e busca por titulo/autor. Os dois filtros sao aplicados pela API. */
export default function FiltrosLivros({ status, onStatusChange, onBuscar }) {
  const [busca, setBusca] = useState("");

  function handleBuscar(event) {
    event.preventDefault();
    onBuscar(busca.trim());
  }

  function handleLimpar() {
    setBusca("");
    onBuscar("");
  }

  return (
    <div className="space-y-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filtrar por status</legend>
        {ABAS.map(({ valor, rotulo }) => (
          <button
            key={valor || "todos"}
            type="button"
            onClick={() => onStatusChange(valor)}
            aria-pressed={status === valor}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              status === valor
                ? "bg-stone-800 text-white"
                : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </fieldset>

      <form onSubmit={handleBuscar} aria-label="Buscar livros" className="flex gap-2">
        <label htmlFor="busca-livros" className="sr-only">
          Buscar por título ou autor
        </label>
        <input
          id="busca-livros"
          type="search"
          value={busca}
          maxLength={100}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por título ou autor"
          className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <button
          type="submit"
          className="rounded-md bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={handleLimpar}
          className="rounded-md px-3 py-2 font-medium text-stone-600 hover:bg-stone-200"
        >
          Limpar
        </button>
      </form>
    </div>
  );
}
