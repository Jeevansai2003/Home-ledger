import type { Metadata } from "next";
// Fonts are bundled with the app (no internet needed while running or building)
import "@fontsource-variable/figtree";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Home Ledger", template: "%s | Home Ledger" },
  description: "A shared money ledger for your household.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
