import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koda-A | Nyati Core",
  description: "AI Architect powered by Nyati-core01",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
