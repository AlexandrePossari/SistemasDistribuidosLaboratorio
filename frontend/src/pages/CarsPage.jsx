import { useEffect, useState } from "react";
import CarFilter from "../components/CarFilter.jsx";
import CarForm from "../components/CarForm.jsx";
import CarList from "../components/CarList.jsx";
import {
  atualizarCarro,
  criarCarro,
  listarCarros,
  obterCarro,
  removerCarro,
  substituirCarro,
} from "../services/cars.js";
import { formatarPreco, nomeDoCarro } from "../utils/cars.js";

// Os dados vem da API (backend FastAPI + PostgreSQL). Depois de cada alteracao a
// lista e buscada de novo, para refletir exatamente o que esta no banco.
export default function CarsPage() {
  const [carros, setCarros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [versao, setVersao] = useState(0);
  const [carroEmEdicao, setCarroEmEdicao] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `versao` so existe para forcar uma nova busca.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErroLista(null);

    listarCarros({ marca: filtro })
      .then((dados) => {
        if (ativo) {
          setCarros(dados);
        }
      })
      .catch((erro) => {
        if (ativo) {
          setCarros([]);
          setErroLista(erro.message);
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    // Ignora respostas de buscas antigas (ex.: filtro trocado antes da resposta chegar).
    return () => {
      ativo = false;
    };
  }, [filtro, versao]);

  function recarregar() {
    setVersao((atual) => atual + 1);
  }

  /** Executa uma chamada a API, mostra o aviso de sucesso ou de erro e recarrega a lista. */
  async function executar(acao, mensagemSucesso, mensagemFalha) {
    setAviso(null);
    try {
      const resultado = await acao();
      setAviso({ tipo: "sucesso", texto: mensagemSucesso(resultado) });
      recarregar();
      return true;
    } catch (erro) {
      setAviso({ tipo: "erro", texto: `${mensagemFalha}: ${erro.message}` });
      if (erro.status === 404) {
        recarregar();
      }
      return false;
    }
  }

  async function salvarCarro(dados) {
    setEnviando(true);
    const sucesso = carroEmEdicao
      ? await executar(
          () => substituirCarro(carroEmEdicao.id, dados),
          (carro) => `${nomeDoCarro(carro)} atualizado.`,
          "Não foi possível salvar o carro",
        )
      : await executar(
          () => criarCarro(dados),
          (carro) => `${nomeDoCarro(carro)} cadastrado.`,
          "Não foi possível cadastrar o carro",
        );
    setEnviando(false);
    if (sucesso) {
      setCarroEmEdicao(null);
    }
    return sucesso;
  }

  async function iniciarEdicao(id) {
    setAviso(null);
    try {
      // Busca a versao mais recente no backend antes de preencher o formulario.
      setCarroEmEdicao(await obterCarro(id));
    } catch (erro) {
      setAviso({ tipo: "erro", texto: `Não foi possível carregar o carro: ${erro.message}` });
      if (erro.status === 404) {
        recarregar();
      }
    }
  }

  function alterarPreco(id, preco) {
    return executar(
      () => atualizarCarro(id, { preco }),
      (carro) => `Preço de ${nomeDoCarro(carro)} alterado para ${formatarPreco(carro.preco)}.`,
      "Não foi possível alterar o preço",
    );
  }

  async function remover(id) {
    const carro = carros.find((item) => item.id === id);
    const sucesso = await executar(
      () => removerCarro(id),
      () => `${carro ? nomeDoCarro(carro) : "Carro"} removido.`,
      "Não foi possível remover o carro",
    );
    if (sucesso && carroEmEdicao?.id === id) {
      setCarroEmEdicao(null);
    }
    return sucesso;
  }

  return (
    <div className="space-y-6">
      {aviso && (
        <div
          className={`flex items-start justify-between gap-4 rounded-md px-4 py-3 text-sm ${
            aviso.tipo === "erro" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          <p role={aviso.tipo === "erro" ? "alert" : "status"}>{aviso.texto}</p>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Fechar aviso"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CarForm
          key={carroEmEdicao?.id ?? "novo"}
          carro={carroEmEdicao}
          onSubmit={salvarCarro}
          onCancel={() => setCarroEmEdicao(null)}
          enviando={enviando}
        />

        <section aria-labelledby="titulo-lista" aria-busy={carregando} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="titulo-lista" className="text-lg font-semibold text-slate-800">
              Carros
            </h2>
            {!carregando && !erroLista && (
              <span className="text-sm text-slate-500" data-testid="contador-carros">
                {carros.length} {carros.length === 1 ? "carro" : "carros"}
              </span>
            )}
          </div>

          <CarFilter onFiltrar={setFiltro} />

          {carregando ? (
            <p className="rounded-lg bg-white p-6 text-slate-500 shadow-sm">Carregando carros...</p>
          ) : erroLista ? (
            <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-6 text-red-700">
              <p>Não foi possível carregar os carros: {erroLista}</p>
              <button
                type="button"
                onClick={recarregar}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <CarList
              carros={carros}
              onEdit={iniciarEdicao}
              onUpdatePrice={alterarPreco}
              onRemove={remover}
            />
          )}
        </section>
      </div>
    </div>
  );
}
