import type { Metadata, Viewport } from "next";
import "@bamora/ui/globals.css";
import "./app.css";

export const metadata: Metadata = {
  title: "BAMORA",
  description: "سوق فاخر — تجربة تسوق مريحة ومباشرة للعميل.",
  applicationName: "BAMORA",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
