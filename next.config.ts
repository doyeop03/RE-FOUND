import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH ?? "",
  trailingSlash: true,
  images: { unoptimized: true },
  // 같은 와이파이의 휴대폰에서 개발 서버(npm run dev:phone) 접속 허용 — 개발 모드에서만 쓰인다
  allowedDevOrigins: ["172.30.1.42"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
