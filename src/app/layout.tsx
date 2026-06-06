import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-sans-sc",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  title: "EP Mentor — 心脏电生理AI导师",
  description:
    "面向心脏电生理医生的AI教学平台，提供病例学习、AI导师对话、知识测验和病例投稿功能。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansSC.variable} ${notoSerifSC.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
