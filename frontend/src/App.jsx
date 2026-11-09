import CarsPage from "./pages/CarsPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <h1 className="text-2xl font-bold">Gerenciador de Carros</h1>
          <p className="text-sm text-slate-300">Sistemas Distribuídos · Prática 7</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <CarsPage />
      </main>
    </div>
  );
}
