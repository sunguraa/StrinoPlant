const PUBLIC_ASSET_MARKERS = ["/wiki-cache/", "/icons/", "/maps/", "/presets/"] as const;

function hasProtocol(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

export function normalizeBasePath(value?: string | null): string {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === "/") {
    return "";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function withBasePath(path: string): string {
  if (!path) {
    return BASE_PATH || "/";
  }

  if (path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("//")) {
    return path;
  }

  if (hasProtocol(path)) {
    return path;
  }

  const queryStart = path.search(/[?#]/);
  const pathname = queryStart === -1 ? path : path.slice(0, queryStart);
  const suffix = queryStart === -1 ? "" : path.slice(queryStart);
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (
    !BASE_PATH ||
    normalizedPathname === BASE_PATH ||
    normalizedPathname.startsWith(`${BASE_PATH}/`)
  ) {
    return `${normalizedPathname}${suffix}`;
  }

  return `${BASE_PATH}${normalizedPathname}${suffix}`;
}

function extractPublicAssetPath(value: string): string | null {
  for (const marker of PUBLIC_ASSET_MARKERS) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex !== -1) {
      return value.slice(markerIndex);
    }
  }

  return null;
}

export function normalizePublicAssetUrl(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  try {
    const absoluteUrl = new URL(url);
    const publicAssetPath = extractPublicAssetPath(absoluteUrl.pathname);
    return publicAssetPath ? withBasePath(publicAssetPath) : url;
  } catch {
    const publicAssetPath = extractPublicAssetPath(url);
    return publicAssetPath ? withBasePath(publicAssetPath) : withBasePath(url);
  }
}

export function toAbsoluteUrl(path: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${withBasePath(path)}`;
}