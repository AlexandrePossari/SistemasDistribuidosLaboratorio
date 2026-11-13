import { useEffect, useState } from "react";
import Aviso from "../components/Aviso.jsx";
import FiltrosLivros from "../components/FiltrosLivros.jsx";
import ListaLivros from "../components/ListaLivros.jsx";
import LivroForm from "../components/LivroForm.jsx";
import ResumoLeitura from "../components/ResumoLeitura.jsx";
import {
  atualizarLivro,
  criarLivro,
  listarLivros,
  obterLivro,
  obterResumo,
  removerLivro,
  substituirLivro,
} from "../services/livros.js";
import { rotuloDoStatus } from "../utils/livros.js";

// Os dados vem da API. Depois de cada alteracao a lista e o resumo sao buscados de novo,
// para a tela mostrar exatamente o que esta no banco.
export default function BibliotecaPage() {
  const [livros, setLivros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [filtro, setFiltro] = useState({ status: "", busca: "" });
  const [versao, setVersao] = useState(0);
  const [livroEmEdicao, setLivroEmEdicao] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `versao` existe para forcar uma nova busca.
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErroLista(null);

    listarLivros({ status: filtro.status, busca: filtro.busca })
      .then((dados) => ativo && setLivros(dados))
      .catch((erro) => {
        if (ativo) {
          setLivros([]);
          setErroLista(erro.message);
        }
      })
      .finally(() => ativo && setCarregando(false));

    // Ignora a resposta de uma busca antiga (ex.: o filtro mudou antes de ela chegar).
    return () => {
      ativo = false;
    };
  }, [filtro, versao]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `versao` existe para forcar uma nova busca.
  useEffect(() => {
    // O resumo e um complemento: se falhar, a mensagem de erro da lista ja avisa o usuario.
    obterResumo()
      .then(setResumo)
      .catch(() => setResumo(null));
  }, [versao]);

  function recarregar() {
    setVersao((atual) => atual + 1);
  }

  /** Executa uma chamada a API e mostra o aviso de sucesso ou de erro. */
  async function executar(acao, mensagemSucesso, mensagemFalha) {
    setAviso(null);
    try {
      const resultado = await acao();
      setAviso({ tipo: "sucesso", texto: mensagemSucesso(resultado) });
      recarregar();
      return true;
    } catch (erro) {
      setAviso({ tipo: "erro", texto: `${mensagemFalha}: ${erro.message}` });
      // 404: o livro foi excluido em outro lugar; a lista desatualizada e recarregada.
      if (erro.status === 404) {
        recarregar();
      }
      return false;
    }
  }

  async function salvar(dados) {
    setEnviando(true);
    const sucesso = livroEmEdicao
      ? await executar(
          () => substituirLivro(livroEmEdicao.id, dados),
          (livro) => `"${livro.titulo}" atualizado.`,
          "Não foi possível salvar o livro",
        )
      : await executar(
          () => criarLivro(dados),
          (livro) => `"${livro.titulo}" adicionado à biblioteca.`,
          "Não foi possível adicionar o livro",
        );
    setEnviando(false);
    if (sucesso) {
      setLivroEmEdicao(null);
    }
    return sucesso;
  }

  async function iniciarEdicao(id) {
    setAviso(null);
    try {
      // Busca a versao atual no backend antes de preencher o formulario.
      setLivroEmEdicao(await obterLivro(id));
    } catch (erro) {
      setAviso({ tipo: "erro", texto: `Não foi possível abrir o livro: ${erro.message}` });
      if (erro.status === 404) {
        recarregar();
      }
    }
  }

  function alterarStatus(id, status) {
    return executar(
      () => atualizarLivro(id, { status }),
      (livro) => `"${livro.titulo}" agora está em ${rotuloDoStatus(livro.status)}.`,
      "Não foi possível mudar o status",
    );
  }

  function avaliar(id, avaliacao) {
    return executar(
      () => atualizarLivro(id, { avaliacao }),
      (livro) =>
        livro.avaliacao === null
          ? `Avaliação de "${livro.titulo}" removida.`
          : `"${livro.titulo}" avaliado com ${livro.avaliacao} de 5.`,
      "Não foi possível salvar a avaliação",
    );
  }

  async function excluir(id) {
    const livro = livros.find((item) => item.id === id);
    const sucesso = await executar(
      () => removerLivro(id),
      () => `"${livro?.titulo ?? "Livro"}" excluído.`,
      "Não foi possível excluir o livro",
    );
    if (sucesso && livroEmEdicao?.id === id) {
      setLivroEmEdicao(null);
    }
    return sucesso;
  }

  const filtrando = filtro.status !== "" || filtro.busca !== "";

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-stone-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold">Minha Biblioteca</h1>
            <p className="text-sm text-stone-400">Seus livros, suas leituras, suas notas.</p>
          </div>
          <ResumoLeitura resumo={resumo} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Aviso aviso={aviso} onFechar={() => setAviso(null)} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <LivroForm
            key={livroEmEdicao?.id ?? "novo"}
            livro={livroEmEdicao}
            onSubmit={salvar}
            onCancel={() => setLivroEmEdicao(null)}
            enviando={enviando}
          />

          <section aria-labelledby="titulo-livros" aria-busy={carregando} className="space-y-4">
            <h2 id="titulo-livros" className="text-lg font-semibold text-stone-800">
              Livros
            </h2>
            <FiltrosLivros
              status={filtro.status}
              onStatusChange={(status) => setFiltro((atual) => ({ ...atual, status }))}
              onBuscar={(busca) => setFiltro((atual) => ({ ...atual, busca }))}
            />

            {carregando ? (
              <p className="rounded-xl bg-white p-8 text-center text-stone-500 shadow-sm ring-1 ring-stone-200">
                Carregando livros...
              </p>
            ) : erroLista ? (
              <div role="alert" className="space-y-3 rounded-xl bg-red-50 p-6 text-red-800">
                <p>Não foi possível carregar os livros: {erroLista}</p>
                <button
                  type="button"
                  onClick={recarregar}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <ListaLivros
                livros={livros}
                filtrando={filtrando}
                onEditar={iniciarEdicao}
                onAlterarStatus={alterarStatus}
                onAvaliar={avaliar}
                onExcluir={excluir}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
