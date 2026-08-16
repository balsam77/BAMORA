import type { Metadata } from "next";
import "@bamora/ui/globals.css";

export const metadata: Metadata = {
  title: "BAMORA Admin",
  description: "Super admin control center for BAMORA platform operations.",
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
