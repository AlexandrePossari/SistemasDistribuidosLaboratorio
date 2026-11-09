import { useState } from "react";
import { formatarPreco, nomeDoCarro } from "../utils/cars.js";
import { validarPreco } from "../utils/validation.js";

/** Um carro da lista, com acoes de editar, alterar o preco (PATCH) e remover. */
export default function CarItem({ carro, onEdit, onUpdatePrice, onRemove }) {
  const [editandoPreco, setEditandoPreco] = useState(false);
  const [preco, setPreco] = useState(String(carro.preco));
  const [erro, setErro] = useState(null);
  const nome = nomeDoCarro(carro);

  function abrirEdicaoPreco() {
    setPreco(String(carro.preco));
    setErro(null);
    setEditandoPreco(true);
  }

  async function handleSalvarPreco(event) {
    event.preventDefault();
    const mensagem = validarPreco(preco);
    setErro(mensagem);
    if (mensagem) {
      return;
    }
    const sucesso = await onUpdatePrice(carro.id, Number(preco));
    if (sucesso) {
      setEditandoPreco(false);
    }
  }

  return (
    <li className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">{nome}</p>
          <p className="text-sm text-slate-500">
            {carro.ano} · {carro.cor} · {formatarPreco(carro.preco)}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(carro.id)}
            aria-label={`Editar ${nome}`}
            className="rounded-md px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={abrirEdicaoPreco}
            aria-label={`Alterar preço de ${nome}`}
            className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Preço
          </button>
          <button
            type="button"
            onClick={() => onRemove(carro.id)}
            aria-label={`Remover ${nome}`}
            className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Remover
          </button>
        </div>
      </div>

      {editandoPreco && (
        <form
          onSubmit={handleSalvarPreco}
          noValidate
          aria-label={`Novo preço de ${nome}`}
          className="flex flex-wrap items-start gap-2"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={`preco-${carro.id}`} className="sr-only">
              Novo preço (R$)
            </label>
            <input
              id={`preco-${carro.id}`}
              type="number"
              step="0.01"
              value={preco}
              onChange={(event) => setPreco(event.target.value)}
              aria-invalid={Boolean(erro)}
              className="w-40 rounded-md border border-slate-300 px-3 py-1 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 aria-invalid:border-red-500"
            />
            {erro && (
              <p role="alert" className="text-sm text-red-600">
                {erro}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Salvar preço
          </button>
          <button
            type="button"
            onClick={() => setEditandoPreco(false)}
            className="rounded-md px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
        </form>
      )}
    </li>
  );
}
