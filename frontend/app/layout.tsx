import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter font
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "I-View Academy",
  description: "AI Curriculum Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply Inter font globally */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}