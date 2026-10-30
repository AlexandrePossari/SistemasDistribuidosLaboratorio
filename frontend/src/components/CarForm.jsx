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

export default function CarForm({ onSubmit }) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erros, setErros] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setValores((anteriores) => ({ ...anteriores, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const novosErros = validarCarro(valores);
    setErros(novosErros);
    if (possuiErros(novosErros)) {
      return;
    }
    onSubmit(normalizarCarro(valores));
    setValores(VALORES_INICIAIS);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Cadastrar carro"
      className="space-y-4 rounded-lg bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-800">Cadastrar carro</h2>

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

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        Cadastrar
      </button>
    </form>
  );
}
