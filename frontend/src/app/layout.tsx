import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Sinhala } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansSinhala = Noto_Sans_Sinhala({
  variable: "--font-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Teso Intellicon",
  description:
    "Course platform where students join by invitation and teacher accounts are approved by an admin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="si" className={`${geistSans.variable} ${geistMono.variable} ${notoSansSinhala.variable}`}>
      <body>{children}</body>
    </html>
  );
}
