"use client";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>Não foi possível abrir esta carga.</h1>
      <p>Os dados não foram substituídos. Tente carregar novamente.</p>
      <button onClick={reset}>Tentar novamente</button>
    </main>
  );
}
