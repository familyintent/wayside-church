import { withBase } from "./paths";

type ImageSize = {
  width: number;
  height: number;
};

type ImageLayout = "hero" | "panel" | "leader";

const imageSizes: Record<string, ImageSize> = {
  "/images/wayside-welcome-hero.webp": { width: 1717, height: 916 },
  "/images/wayside-welcome-hero-640.webp": { width: 640, height: 341 },
  "/images/wayside-welcome-hero-960.webp": { width: 960, height: 512 },
  "/images/wayside-welcome-hero-1280.webp": { width: 1280, height: 683 },
  "/images/wayside-community.webp": { width: 1400, height: 1855 },
  "/images/wayside-community-420.webp": { width: 420, height: 556 },
  "/images/wayside-community-700.webp": { width: 700, height: 928 },
  "/images/wayside-community-960.webp": { width: 960, height: 1272 },
  "/images/charlton.webp": { width: 852, height: 1080 },
  "/images/charlton-420.webp": { width: 420, height: 532 },
  "/images/charlton-640.webp": { width: 640, height: 811 },
  "/images/chase-mendoza.webp": { width: 629, height: 549 },
  "/images/chase-mendoza-320.webp": { width: 320, height: 279 },
  "/images/chase-mendoza-480.webp": { width: 480, height: 419 },
  "/images/owen-rushing.webp": { width: 900, height: 1350 },
  "/images/owen-rushing-320.webp": { width: 320, height: 480 },
  "/images/owen-rushing-640.webp": { width: 640, height: 960 },
  "/images/wayside-social-card.jpg": { width: 1200, height: 630 },
  "/images/wayside-logo-mark-navy.png": { width: 361, height: 546 },
  "/images/wayside-logo-mark-white.png": { width: 361, height: 546 },
};

export const imageVariants: Record<string, string[]> = {
  "/images/wayside-welcome-hero.webp": [
    "/images/wayside-welcome-hero-640.webp",
    "/images/wayside-welcome-hero-960.webp",
    "/images/wayside-welcome-hero-1280.webp",
    "/images/wayside-welcome-hero.webp",
  ],
  "/images/wayside-community.webp": [
    "/images/wayside-community-420.webp",
    "/images/wayside-community-700.webp",
    "/images/wayside-community-960.webp",
    "/images/wayside-community.webp",
  ],
  "/images/charlton.webp": [
    "/images/charlton-420.webp",
    "/images/charlton-640.webp",
    "/images/charlton.webp",
  ],
  "/images/chase-mendoza.webp": [
    "/images/chase-mendoza-320.webp",
    "/images/chase-mendoza-480.webp",
    "/images/chase-mendoza.webp",
  ],
  "/images/owen-rushing.webp": [
    "/images/owen-rushing-320.webp",
    "/images/owen-rushing-640.webp",
    "/images/owen-rushing.webp",
  ],
};

const responsiveSizes: Record<ImageLayout, string> = {
  hero: "100vw",
  panel: "(max-width: 879px) calc(100vw - 2rem), 50vw",
  leader: "(max-width: 679px) calc(100vw - 2rem), 36vw",
};

export function imageSize(path: string): ImageSize | undefined {
  return imageSizes[path];
}

export function imageSrcset(path: string): string | undefined {
  const variants = imageVariants[path];
  if (!variants) return undefined;

  return variants
    .map((variantPath) => {
      const size = imageSize(variantPath);
      return size ? `${withBase(variantPath)} ${size.width}w` : "";
    })
    .filter(Boolean)
    .join(", ");
}

export function imageSizesFor(layout: ImageLayout = "panel"): string {
  return responsiveSizes[layout];
}
