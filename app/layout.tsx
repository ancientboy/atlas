import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Atlas — Growth Operator",
  description: "面向 AI 创业者的主动式增长执行工作台。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
