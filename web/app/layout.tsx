// root layout — almarai for body text, instrument serif for italic accents

import type { Metadata } from "next"
import { Almarai, Instrument_Serif } from "next/font/google"
import "./globals.css"

const almarai = Almarai({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai"
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-instrument-serif"
})

export const metadata: Metadata = {
  title: "trove",
  description: "gets indian freelancers back the tds the system quietly keeps — refund math and a ready-to-file itr-4, computed entirely in your browser."
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${almarai.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full bg-black text-[#E5E7EB]">{children}</body>
    </html>
  )
}
