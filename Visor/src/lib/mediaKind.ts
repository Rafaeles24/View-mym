export function detectMediaKind(url: string, mimeType?: string) : "image" | "video" | "unknown" {
    if (mimeType) {
        if (mimeType.startsWith("image/")) return "image";
        if (mimeType.startsWith("video/")) return "video";
    }

    const clean = url.split("?")[0].toLowerCase();

    if (clean.match(/\.(png|jpg|jpeg|webp|gif)$/)) return "image";
    if (clean.match(/\.(mp4|webm|ogg|mov)$/)) return "video";

    return "unknown";
}