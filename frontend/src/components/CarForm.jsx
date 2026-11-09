import { useState } from "react";
import {
  ANO_MAXIMO,
  ANO_MINIMO,
  normalizarCarro,
  possuiErros,
  validarCarro,
} from "../utils/validation.js";

const VALORES_INICIAIS = { marca: "", modelo: "", ano: "", cor: "", preco: "" };

const CAMPOS = [
  { nome: "marca", rotulo: "Marca", tipo: "text", placeholder: "Toyota" },
  { nome: "modelo", rotulo: "Modelo", tipo: "text", placeholder: "Corolla" },
  {
    nome: "ano",
    rotulo: "Ano",
    tipo: "number",
    placeholder: "2024",
    min: ANO_MINIMO,
    max: ANO_MAXIMO,
  },
  { nome: "cor", rotulo: "Cor", tipo: "text", placeholder: "Prata" },
  { nome: "preco", rotulo: "Preço (R$)", tipo: "number", placeholder: "150000", step: "0.01" },
];

function valoresDoCarro(carro) {
  if (!carro) {
    return VALORES_INICIAIS;
  }
  return Object.fromEntries(
    Object.keys(VALORES_INICIAIS).map((campo) => [campo, String(carro[campo])]),
  );
}

/**
 * Formulario de cadastro e de edicao. Sem `carro` cadastra; com `carro` edita.
 * `onSubmit` deve retornar (ou resolver) true quando a API aceitar os dados:
 * so entao o formulario de cadastro e limpo.
 */
export default function CarForm({ carro = null, onSubmit, onCancel, enviando = false }) {
  const [valores, setValores] = useState(() => valoresDoCarro(carro));
  const [erros, setErros] = useState({});
  const editando = carro !== null;
  const titulo = editando ? `Editar ${carro.marca} ${carro.modelo}` : "Cadastrar carro";

  function handleChange(event) {
    const { name, value } = event.target;
    setValores((anteriores) => ({ ...anteriores, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const novosErros = validarCarro(valores);
    setErros(novosErros);
    if (possuiErros(novosErros)) {
      return;
    }
    const sucesso = await onSubmit(normalizarCarro(valores));
    if (sucesso && !editando) {
      setValores(VALORES_INICIAIS);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={titulo}
      className="space-y-4 rounded-lg bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map(({ nome, rotulo, tipo, ...extras }) => (
          <div key={nome} className="flex flex-col gap-1">
            <label htmlFor={`carro-${nome}`} className="text-sm font-medium text-slate-700">
              {rotulo}
            </label>
            <input
              id={`carro-${nome}`}
              name={nome}
              type={tipo}
              value={valores[nome]}
              onChange={handleChange}
              aria-invalid={Boolean(erros[nome])}
              aria-describedby={erros[nome] ? `erro-${nome}` : undefined}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 aria-invalid:border-red-500"
              {...extras}
            />
            {erros[nome] && (
              <p id={`erro-${nome}`} role="alert" className="text-sm text-red-600">
                {erros[nome]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
        </button>
        {editando && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
