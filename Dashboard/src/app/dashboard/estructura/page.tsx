import EstructuraUI from "@/client/estructura/ui";
import { Campaign } from "@/types/campaign";
import { Sede } from "@/types/sede";

async function getCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/campaign`, {
    cache: "no-store"
  });

  return await res.json() as Campaign[];
}

async function getSedes(): Promise<Sede[]> {
  const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/sede`, {
    cache: "no-store"
  });
  return await res.json() as Sede[];
}

export default async function Estructura() {
  const sedes = await getSedes();
  const campaigns = await getCampaigns();

  return <EstructuraUI campaigns={campaigns} sedes={sedes}/>
}