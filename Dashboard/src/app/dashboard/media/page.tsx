import MediaUI from "@/client/media/ui";
import { MediaType, PaginationMedia } from "@/types/cardMedia";

async function getMedias(): Promise<PaginationMedia> {
  const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/media`, {
    cache: "no-store"
  });

  return await res.json() as PaginationMedia;
}

export default async function Media() {
  const medias = await getMedias();
  return <MediaUI contentData={medias}/>
}