/** Mensagem de sucesso (role=status) ou de erro (role=alert) de uma acao. */
export default function Aviso({ aviso, onFechar }) {
  if (!aviso) {
    return null;
  }
  const erro = aviso.tipo === "erro";
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-md px-4 py-3 text-sm ${
        erro ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-800"
      }`}
    >
      <p role={erro ? "alert" : "status"}>{aviso.texto}</p>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="font-bold">
        ×
      </button>
    </div>
  );
}
