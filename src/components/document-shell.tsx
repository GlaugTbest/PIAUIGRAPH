import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function DocumentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="document-shell">
      <header className="document-header">
        <Link href="/">PIAUIGRAPH</Link>
        <Link href="/">
          <ArrowLeft size={15} />
          Voltar ao mapa
        </Link>
      </header>
      <main className="document-main">{children}</main>
    </div>
  );
}
