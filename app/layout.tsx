import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知炊 · 懂手边食材，知今晚吃什么",
  description: "知炊，懂手边食材，知今晚吃什么。根据现有食材和口味安排晚餐，支持分步烹饪、购物清单与开饭记录。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
