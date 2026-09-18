import SedeViews from "@/app/client/sedeViews/ui";
import { AllSedeData } from "@/types/allSedeData";
import { notFound } from "next/navigation";

async function getAllData(sedeId: string): Promise<AllSedeData> {
  if (!/^[1-9]\d*$/.test(sedeId)) {
    notFound();
  }

  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}system/api/visor/all/${sedeId}`, {
    cache: 'no-store'
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Error a consultar la sede: ${response.status}`);
  }
  
  const data: AllSedeData = await response.json();
  return data;
}

export default async function SedePage({
  params
}: {
  params: Promise<{id: string}>
}) {
  const {id} = await params;

  const data = await getAllData(id);

  return (
    <SedeViews
      sede={data.sede}
      sedeMedia={data.flyerSede}
      rankingAgenteSede={data.rankingAgenteSede ?? []}
      rankingGlobalAgente={data.rankingGlobalAgente ?? []}
      rankingGlobalCerrador={data.rankingGlobalCerrador ?? []}

      sedesStatsDiario={data.sedesStatsDiario}
      rankingRango={data.rankingRango}
      time={data.time}
    />
  )
}