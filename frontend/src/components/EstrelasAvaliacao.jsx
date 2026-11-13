const NOTAS = [1, 2, 3, 4, 5];

/** Cinco estrelas clicaveis. Clicar na nota atual remove a avaliacao. */
export default function EstrelasAvaliacao({ valor, titulo, onAvaliar }) {
  return (
    <fieldset className="flex items-center gap-0.5">
      <legend className="sr-only">Avaliação de {titulo}</legend>
      {NOTAS.map((nota) => {
        const marcada = valor !== null && nota <= valor;
        const atual = nota === valor;
        return (
          <button
            key={nota}
            type="button"
            onClick={() => onAvaliar(atual ? null : nota)}
            aria-pressed={atual}
            aria-label={
              atual ? `Remover avaliação de ${titulo}` : `Avaliar ${titulo} com ${nota} de 5`
            }
            title={atual ? "Remover avaliação" : `${nota} de 5`}
            className={`text-xl leading-none transition hover:scale-110 ${
              marcada ? "text-amber-500" : "text-stone-300"
            }`}
          >
            ★
          </button>
        );
      })}
    </fieldset>
  );
}
