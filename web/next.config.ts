import type { NextConfig } from "next"

// Extract origin from dynamic video URL to prevent CSP blocks without hardcoding
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

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  mediaSrcDirective,
  "connect-src 'self' http://localhost:* ws://localhost:* https://*.workers.dev wss://*.workers.dev",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ")

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.higgs.ai" },
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ]
      }
    ]
  }
}

export default nextConfig
