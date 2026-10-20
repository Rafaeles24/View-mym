import { getExtension } from "./getExtension";

export function getMediaType(url: string): string {
  const extension = getExtension(url);

  const videoExtensions = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];

  if (videoExtensions.includes(extension)) {
    return "video";
  }
  if (imageExtensions.includes(extension)) {
    return "image";
  }
  return "unknown";
}