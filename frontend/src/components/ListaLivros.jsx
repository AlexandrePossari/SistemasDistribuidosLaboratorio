import LivroCard from "./LivroCard.jsx";

export default function ListaLivros({ livros, filtrando, ...acoes }) {
  if (livros.length === 0) {
    return (
      <p className="rounded-xl bg-white p-8 text-center text-stone-500 shadow-sm ring-1 ring-stone-200">
        {filtrando
          ? "Nenhum livro encontrado com esses filtros."
          : "Nenhum livro ainda — adicione o primeiro."}
      </p>
    );
  }

  return (
    <ul aria-label="Livros" className="space-y-3">
      {livros.map((livro) => (
        <LivroCard key={livro.id} livro={livro} {...acoes} />
      ))}
    </ul>
  );
}
