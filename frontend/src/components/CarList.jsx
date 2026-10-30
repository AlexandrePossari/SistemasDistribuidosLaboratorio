import { formatarPreco } from "../utils/cars.js";

export default function CarList({ carros, onRemove }) {
  if (carros.length === 0) {
    return (
      <p className="rounded-lg bg-white p-6 text-slate-500 shadow-sm">Nenhum carro encontrado.</p>
    );
  }

  return (
    <ul aria-label="Carros cadastrados" className="space-y-3">
      {carros.map((carro) => (
        <li
          key={carro.id}
          className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
        >
          <div>
            <p className="font-semibold text-slate-800">
              {carro.marca} {carro.modelo}
            </p>
            <p className="text-sm text-slate-500">
              {carro.ano} · {carro.cor} · {formatarPreco(carro.preco)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(carro.id)}
            aria-label={`Remover ${carro.marca} ${carro.modelo}`}
            className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Remover
          </button>
        </li>
      ))}
    </ul>
  );
}
