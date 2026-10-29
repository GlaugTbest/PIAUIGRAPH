import Link from "next/link";
export default function NotFound() {
  return (
    <main className="fatal">
      <h1>Página não encontrada.</h1>
      <Link href="/">Voltar ao mapa do Piauí</Link>
    </main>
  );
}
