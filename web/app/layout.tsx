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
  description: "agent that gets indian freelancers back the tax money the system quietly keeps."
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${almarai.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full bg-black text-[#E5E7EB]">{children}</body>
    </html>
  )
}
