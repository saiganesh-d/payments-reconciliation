import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaySync — Payment Consolidation",
  description: "Daily payment reconciliation and tracking portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="noise-bg mesh-gradient min-h-screen">
        {children}
      </body>
    </html>
  );
}
