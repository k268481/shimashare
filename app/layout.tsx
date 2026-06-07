import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "シマシェア｜離島の助け合いアプリ",
  description:
    "離島コミュニティ向け。平常時は物資シェアと店舗取り寄せ、緊急時は助け合いのインフラ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366F1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background text-text-primary">{children}</body>
    </html>
  );
}
