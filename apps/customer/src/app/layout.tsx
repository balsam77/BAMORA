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
  const languageBootScript = `
    (function () {
      try {
        var key = "bamoraLanguage";
        var value = localStorage.getItem(key);
        var language = value === "en" || value === "he" || value === "ar" ? value : "ar";
        var direction = language === "en" ? "ltr" : "rtl";
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
      } catch (_error) {
        // Keep safe defaults when storage is unavailable.
      }
    })();
  `;

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: languageBootScript }} />
        {children}
      </body>
    </html>
  );
}
