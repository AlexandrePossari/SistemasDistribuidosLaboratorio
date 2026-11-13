import { useState } from "react";
import { STATUS_LEITURA } from "../utils/livros.js";
import { LIMITES, montarLivro, possuiErros, validarLivro } from "../utils/validacao.js";

const VALORES_INICIAIS = { titulo: "", autor: "", status: "quero_ler", avaliacao: "", notas: "" };

function valoresDoLivro(livro) {
  if (!livro) {
    return VALORES_INICIAIS;
  }
  return {
    titulo: livro.titulo,
    autor: livro.autor,
    status: livro.status,
    avaliacao: livro.avaliacao === null ? "" : String(livro.avaliacao),
    notas: livro.notas,
  };
}

const ESTILO_CAMPO =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200 aria-invalid:border-red-500";

function Erro({ campo, mensagem }) {
  if (!mensagem) {
    return null;
  }
  return (
    <p id={`erro-${campo}`} role="alert" className="text-sm text-red-600">
      {mensagem}
    </p>
  );
}

/**
 * Formulario de cadastro (sem `livro`) e de edicao (com `livro`).
 * `onSubmit` deve resolver true quando a API aceitar: so entao o cadastro e limpo.
 */
export default function LivroForm({ livro = null, onSubmit, onCancel, enviando = false }) {
  const [valores, setValores] = useState(() => valoresDoLivro(livro));
  const [erros, setErros] = useState({});
  const editando = livro !== null;
  const titulo = editando ? `Editar "${livro.titulo}"` : "Adicionar livro";

  function alterar(campo, valor) {
    setValores((anteriores) => {
      const novos = { ...anteriores, [campo]: valor };
      // Mesma regra do backend: so livro lido tem avaliacao.
      if (campo === "status" && valor !== "lido") {
        novos.avaliacao = "";
      }
      return novos;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const novosErros = validarLivro(valores);
    setErros(novosErros);
    if (possuiErros(novosErros)) {
      return;
    }
    const sucesso = await onSubmit(montarLivro(valores));
    if (sucesso && !editando) {
      setValores(VALORES_INICIAIS);
    }
  }

  function propsDoCampo(campo) {
    return {
      id: `livro-${campo}`,
      name: campo,
      value: valores[campo],
      onChange: (event) => alterar(campo, event.target.value),
      "aria-invalid": Boolean(erros[campo]),
      "aria-describedby": erros[campo] ? `erro-${campo}` : undefined,
      className: ESTILO_CAMPO,
    };
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={titulo}
      className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200"
    >
      <h2 className="text-lg font-semibold text-stone-800">{titulo}</h2>

      <div className="space-y-1">
        <label htmlFor="livro-titulo" className="text-sm font-medium text-stone-700">
          Título
        </label>
        <input type="text" maxLength={LIMITES.titulo} {...propsDoCampo("titulo")} />
        <Erro campo="titulo" mensagem={erros.titulo} />
      </div>

      <div className="space-y-1">
        <label htmlFor="livro-autor" className="text-sm font-medium text-stone-700">
          Autor
        </label>
        <input type="text" maxLength={LIMITES.autor} {...propsDoCampo("autor")} />
        <Erro campo="autor" mensagem={erros.autor} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="livro-status" className="text-sm font-medium text-stone-700">
            Status
          </label>
          <select {...propsDoCampo("status")}>
            {STATUS_LEITURA.map(({ valor, rotulo }) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        {valores.status === "lido" && (
          <div className="space-y-1">
            <label htmlFor="livro-avaliacao" className="text-sm font-medium text-stone-700">
              Avaliação
            </label>
            <select {...propsDoCampo("avaliacao")}>
              <option value="">Sem avaliação</option>
              {[5, 4, 3, 2, 1].map((nota) => (
                <option key={nota} value={nota}>
                  {"★".repeat(nota)} ({nota})
                </option>
              ))}
            </select>
            <Erro campo="avaliacao" mensagem={erros.avaliacao} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="livro-notas" className="text-sm font-medium text-stone-700">
          Notas
        </label>
        <textarea
          rows={4}
          maxLength={LIMITES.notas}
          placeholder="O que você achou, trechos marcantes, quem indicou..."
          {...propsDoCampo("notas")}
        />
        <Erro campo="notas" mensagem={erros.notas} />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar"}
        </button>
        {editando && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 font-medium text-stone-600 hover:bg-stone-100"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
