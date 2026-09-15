import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monroe Glass Plant Evolution",
  description:
    "Explore and edit the Monroe glass plant as it develops from an empty shell to current production.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/plant-icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/plant-icon.png", type: "image/png", sizes: "512x512" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
