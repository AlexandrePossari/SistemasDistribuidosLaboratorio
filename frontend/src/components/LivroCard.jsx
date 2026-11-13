import { useState } from "react";
import { formatarData, resumirTexto, STATUS_LEITURA } from "../utils/livros.js";
import EstrelasAvaliacao from "./EstrelasAvaliacao.jsx";

const LIMITE_NOTAS = 180;

const COR_DO_STATUS = {
  quero_ler: "bg-sky-100 text-sky-800",
  lendo: "bg-amber-100 text-amber-800",
  lido: "bg-emerald-100 text-emerald-800",
};

/** Um livro da lista, com as acoes rapidas: status, avaliacao, editar e excluir. */
export default function LivroCard({ livro, onEditar, onAlterarStatus, onAvaliar, onExcluir }) {
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const notasLongas = livro.notas.length > LIMITE_NOTAS;
  const lido = livro.status === "lido";

  return (
    <li className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-stone-900 break-words">{livro.titulo}</h3>
          <p className="text-sm text-stone-600">{livro.autor}</p>
        </div>
        <label className="sr-only" htmlFor={`status-${livro.id}`}>
          Status de {livro.titulo}
        </label>
        <select
          id={`status-${livro.id}`}
          value={livro.status}
          onChange={(event) => onAlterarStatus(livro.id, event.target.value)}
          className={`rounded-full border-0 px-3 py-1 text-sm font-medium ${COR_DO_STATUS[livro.status]}`}
        >
          {STATUS_LEITURA.map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>

      {lido && (
        <div className="flex flex-wrap items-center gap-3">
          <EstrelasAvaliacao
            valor={livro.avaliacao}
            titulo={livro.titulo}
            onAvaliar={(nota) => onAvaliar(livro.id, nota)}
          />
          <span className="text-sm text-stone-500">Lido em {formatarData(livro.concluido_em)}</span>
        </div>
      )}

      {livro.notas && (
        <div className="text-sm text-stone-700">
          <p className="whitespace-pre-line">
            {notasAbertas ? livro.notas : resumirTexto(livro.notas, LIMITE_NOTAS)}
          </p>
          {notasLongas && (
            <button
              type="button"
              onClick={() => setNotasAbertas((abertas) => !abertas)}
              aria-expanded={notasAbertas}
              className="mt-1 font-medium text-amber-700 hover:underline"
            >
              {notasAbertas ? "ver menos" : "ver mais"}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        {confirmandoExclusao ? (
          <>
            <span className="text-sm text-stone-700">Excluir este livro?</span>
            <button
              type="button"
              onClick={() => onExcluir(livro.id)}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
            >
              Sim, excluir
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(false)}
              className="rounded-md px-3 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Não
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEditar(livro.id)}
              aria-label={`Editar ${livro.titulo}`}
              className="rounded-md px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(true)}
              aria-label={`Excluir ${livro.titulo}`}
              className="rounded-md px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Excluir
            </button>
          </>
        )}
      </div>
    </li>
  );
}
