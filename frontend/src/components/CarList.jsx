import CarItem from "./CarItem.jsx";

export default function CarList({ carros, onEdit, onUpdatePrice, onRemove }) {
  if (carros.length === 0) {
    return (
      <p className="rounded-lg bg-white p-6 text-slate-500 shadow-sm">Nenhum carro encontrado.</p>
    );
  }

  return (
    <ul aria-label="Carros cadastrados" className="space-y-3">
      {carros.map((carro) => (
        <CarItem
          key={carro.id}
          carro={carro}
          onEdit={onEdit}
          onUpdatePrice={onUpdatePrice}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
