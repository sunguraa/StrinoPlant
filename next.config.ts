import type { NextConfig } from "next";

function normalizeBasePath(value?: string): string {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "/") {
    return "";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const derivedBasePath =
  process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}` : "";
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? derivedBasePath);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "strinova.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.strinova.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "wiki.biligame.com",
        pathname: "/klbq/**",
      },
      {
        protocol: "https",
        hostname: "static.wikitide.net",
        pathname: "/strinovawiki/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
