import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blackhole - Expose localhost to the internet",
  description:
    "Tunnel local services to the internet. Self-host or use the CLI with one command.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
