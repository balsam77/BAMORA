import type { Metadata } from "next";
import "@bamora/ui/globals.css";

export const metadata: Metadata = {
  title: "BAMORA Merchant",
  description: "Merchant operations dashboard for BAMORA partners.",
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
