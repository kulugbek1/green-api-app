import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "MAX Chat · GREEN-API",
  description: "Тестовое задание на должность 'Фронтенд разработчик React'",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.className} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
