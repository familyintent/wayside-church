type ImageSize = {
  width: number;
  height: number;
};

const imageSizes: Record<string, ImageSize> = {
  "/images/wayside-welcome-hero.webp": { width: 1717, height: 916 },
  "/images/wayside-community.webp": { width: 1400, height: 1855 },
  "/images/charlton.webp": { width: 852, height: 1080 },
  "/images/chase-mendoza.webp": { width: 629, height: 549 },
  "/images/owen-rushing.webp": { width: 900, height: 1350 },
  "/images/wayside-logo-mark-navy.png": { width: 361, height: 546 },
  "/images/wayside-logo-mark-white.png": { width: 361, height: 546 },
};

export function imageSize(path: string): ImageSize | undefined {
  return imageSizes[path];
}
