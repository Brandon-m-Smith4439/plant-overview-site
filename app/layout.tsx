import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monroe Glass Plant Evolution",
  description: "Explore the Monroe glass plant as it develops from an empty shell to first production.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
