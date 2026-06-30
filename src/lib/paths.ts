const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const hasScheme = /^[a-z][a-z0-9+.-]*:/i;

export function withBase(path: string): string {
  if (!path || path.startsWith("#") || hasScheme.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!basePath || normalizedPath.startsWith(`${basePath}/`) || normalizedPath === `${basePath}/`) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `${basePath}/` : `${basePath}${normalizedPath}`;
}

export function withoutBase(path: string): string {
  if (!basePath || path === "/") {
    return path;
  }

  if (path === basePath) {
    return "/";
  }

  if (path.startsWith(`${basePath}/`)) {
    return path.slice(basePath.length) || "/";
  }

  return path;
}

export function absoluteUrl(path: string, siteUrl: string): string {
  return new URL(withBase(withoutBase(path)), siteUrl).toString();
}
