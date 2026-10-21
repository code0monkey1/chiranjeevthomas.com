import type { NextConfig } from "next";
import { resolveNamespace } from "./lib/namespace";

/** Old Google Sites paths → new pages, so existing links and search results keep working. */
const OLD_PATHS = ["/home", "/design", "/product", "/pricing", "/marketing", "/who-am-i", "/engineering/:path*", "/startups/:path*"];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The chat API reads content/ at runtime to build its search index.
  outputFileTracingIncludes: { "/api/chat": ["./content/**/*"] },
  // Which Pinecone namespace the chat searches, fixed at build time (see lib/namespace.ts).
  env: { PINECONE_NAMESPACE: resolveNamespace() },
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return OLD_PATHS.map((source) => ({ source, destination: "/", permanent: true }));
  },
  async headers() {
    return [
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default config;
