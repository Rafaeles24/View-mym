import MultimediaUI from "@/components/multimedia/ui";
import { PaginationMedia } from "@/types/media";
import { Sede } from "@/types/sede";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function getData(): Promise<PaginationMedia> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/media`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString(),
    }
  });

  if (response.status === 401) {
    redirect("/auth");
  }

  if (!response.ok) {
    console.error("Failed to fetch data:", response.status, response.statusText);
    throw new Error("Failed to fetch data");
  }

  const data = await response.json()
  return data
}

async function getSedesData(): Promise<Sede[]> {
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/sede`, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch sedes:", response.status, response.statusText);
    throw new Error("Failed to fetch sedes");
  }

  const data = await response.json();
  return data;
}

export default async function Media() {
  const data = await getData();
  const sedes = await getSedesData();
  return <MultimediaUI multimedia={data} sedesData={sedes} />
}