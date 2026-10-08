import { type Metadata } from 'next'
import { Geist, Geist_Mono, Abhaya_Libre, Noto_Sans_Sinhala, Caveat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from "@/components/shared/theme-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const abhayaLibre = Abhaya_Libre({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'sinhala'],
  variable: '--font-abhaya-libre',
});

const notoSansSinhala = Noto_Sans_Sinhala({
  weight: ['400', '500', '600', '700'],
  subsets: ["sinhala"],
  variable: "--font-noto-sans-sinhala",
  display: 'swap',
});

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://teso.lk'),
  title: {
    default: "TESO | Self Study Platform",
    template: "%s"
  },
  description: "Learn like a pro with TESO",
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${abhayaLibre.variable} ${notoSansSinhala.variable} ${caveat.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
          <AuthProvider>
            {children}
            <Toaster />
            <SpeedInsights />
            <Analytics />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
