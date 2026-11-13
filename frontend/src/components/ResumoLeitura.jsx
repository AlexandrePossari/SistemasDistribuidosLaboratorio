import { STATUS_LEITURA } from "../utils/livros.js";

/** Contagem de livros por status, vinda do GET /livros/resumo. */
export default function ResumoLeitura({ resumo }) {
  if (!resumo) {
    return null;
  }
  return (
    <dl aria-label="Resumo da biblioteca" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {STATUS_LEITURA.map(({ valor, rotulo }) => (
        <div key={valor} className="flex items-baseline gap-1.5">
          <dt className="text-stone-300">{rotulo}</dt>
          <dd className="font-semibold text-white" data-testid={`resumo-${valor}`}>
            {resumo[valor]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
