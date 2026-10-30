import { useState } from "react";
import CarFilter from "../components/CarFilter.jsx";
import CarForm from "../components/CarForm.jsx";
import CarList from "../components/CarList.jsx";
import { filtrarPorMarca, proximoId } from "../utils/cars.js";

// Estado apenas local: sem API e sem persistencia nesta pratica.
// A integracao com o backend (/cars) fica para a pratica 7.
export default function CarsPage({ carrosIniciais = [] }) {
  const [carros, setCarros] = useState(carrosIniciais);
  const [filtro, setFiltro] = useState("");

  function adicionarCarro(carro) {
    setCarros((anteriores) => [...anteriores, { ...carro, id: proximoId(anteriores) }]);
  }

  function removerCarro(id) {
    setCarros((anteriores) => anteriores.filter((carro) => carro.id !== id));
  }

  const carrosVisiveis = filtrarPorMarca(carros, filtro);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CarForm onSubmit={adicionarCarro} />

      <section aria-labelledby="titulo-lista" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="titulo-lista" className="text-lg font-semibold text-slate-800">
            Carros
          </h2>
          <span className="text-sm text-slate-500" data-testid="contador-carros">
            {carrosVisiveis.length} de {carros.length}
          </span>
        </div>
        <CarFilter valor={filtro} onChange={setFiltro} />
        <CarList carros={carrosVisiveis} onRemove={removerCarro} />
      </section>
    </div>
  );
}
