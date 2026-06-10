import type { NextConfig } from "next"

const getVideoOrigin = () => {
  const videoUrl = process.env.NEXT_PUBLIC_HERO_VIDEO_URL
  if (!videoUrl) return ""
  try {
    return new URL(videoUrl).origin
  } catch {
    return ""
  }
}

const videoOrigin = getVideoOrigin()
const mediaSrcDirective = `media-src 'self'${videoOrigin ? ` ${videoOrigin}` : ""}`

const isDev = process.env.NODE_ENV !== "production"
const devConnect = isDev ? " http://localhost:* ws://localhost:*" : ""

const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' permits WebAssembly (the client-side Trove tax engine)
  // WITHOUT enabling general eval() — the narrow, correct grant for WASM.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // pdf.js spins up a Web Worker for in-browser PDF text extraction.
  "worker-src 'self' blob:",
  mediaSrcDirective,
  `connect-src 'self'${devConnect}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ")

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ]
      }
    ]
  }
}

export default nextConfig
