import type { Metadata, Viewport } from "next";
import "./civic.css";
export const metadata: Metadata = {
  title: "PIAUIGRAPH — compras públicas do Piauí, sem complicação",
  description:
    "Encontre compras, obras e serviços públicos no Piauí. Entenda os valores e siga as ligações até as fontes oficiais.",
  robots: { index: true, follow: true },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102e42",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
