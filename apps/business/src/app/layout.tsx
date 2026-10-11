import type { Metadata } from "next";
import "@bamora/ui/globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "BAMORA Business",
  description: "Unified BAMORA Business workspace for merchant, admin, and delivery operations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}