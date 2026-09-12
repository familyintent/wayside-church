import type { LatestTeaching } from "./youtube";
import { teachingOverrides } from "./teaching-overrides";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
}

export function getTeachingSlug(video: LatestTeaching) {
  const override = teachingOverrides[video.videoId];
  if (override) return override.slug;

  const titleSlug = slugify(video.title) || "teaching";
  return `${titleSlug}-${video.videoId}`;
}

export function getTeachingPagePath(video: LatestTeaching) {
  return `/teaching/${getTeachingSlug(video)}/`;
}

export function getTeachingEmbedUrl(video: LatestTeaching) {
  return `https://www.youtube-nocookie.com/embed/${video.videoId}`;
}
