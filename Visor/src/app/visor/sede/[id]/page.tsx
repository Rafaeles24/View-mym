import RankingUI from "@/app/client/ranking/ui";
import { RankingList, RankingRangoFecha } from "@/types/ranking";
import { Sede } from "@/types/sede";
import { SedeStats } from "@/types/stats";
import { notFound } from "next/navigation";

async function getSede(sedeId: string): Promise<Sede> {
  if (!/^[1-9]\d*$/.test(sedeId)) {
    notFound();
  }
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}system/api/visor/sede/${sedeId}`, {
    cache: 'no-store'
  });
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error(`Error a consultar la sede: ${response.status}`);
  }
  const sede: Sede = await response.json();
  return sede;
}

async function getRankingAgentesPorSede(sedeId: string) {
  if (!/^[1-9]\d*$/.test(sedeId)) {
    notFound();
  }

  try {

    const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}system/api/visor/ranking/agentes/${sedeId}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });

      if (response.status === 404) {
        notFound();
      }
    
      if (!response.ok) {
        throw new Error(`Error a consultar la sede: ${response.status}`);
      }
    
      const sede: RankingList[] = await response.json();
      return sede;
  
  } catch (error) {
    console.error(`Error de conexion al servidor backend: ${error}`)  
  }
}

async function getRankingGlobalAgentes() {
  try {
    const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}system/api/visor/ranking/global/agente`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });

    if (response.status === 404) {
      notFound();
    }

    if (!response.ok) {
      throw new Error(`Error a consultar la sede: ${response.status}`);
    }

    const sede: RankingList[] = await response.json();
    return sede;
  } catch (error) {
    console.error(`Error de conexion al servidor backend: ${error}`)  
  }
}

async function getRankingGlobalSupervisor() {
  try {

    const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}system/api/visor/ranking/global/cerrador`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });

      if (response.status === 404) {
        notFound();
      }
    
      if (!response.ok) {
        throw new Error(`Error a consultar la sede: ${response.status}`);
      }
    
      const sede: RankingList[] = await response.json();
      return sede;
  
  } catch (error) {
    console.error(`Error de conexion al servidor backend: ${error}`)  
  }
}

async function getSedesStatsDiario(): Promise<SedeStats> {
  const response = await fetch(
    `${process.env.BACKEND_INTERNAL_URL}system/api/visor/stats/sede`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(
      `Error al consultar las estadísticas de sedes: ${response.status}`
    );
  }

  const sedesStats: SedeStats = await response.json();
  return sedesStats;
}

async function getRangofechaRanking(): Promise<RankingRangoFecha> {
  const response = await fetch(
    `${process.env.BACKEND_INTERNAL_URL}system/api/visor/ranking/rango`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(
      `Error al consultar el rango de ranking: ${response.status}`
    );
  }

  const rankingRango: RankingRangoFecha = await response.json();
  return rankingRango;
}

export default async function SedePage({
  params
}: {
  params: Promise<{id: string}>
}) {
  const {id} = await params;

  /* const rankingAgenteDiarioSede = await getRankingDiarioAgentesPorSede(id);
  console.log(rankingAgenteDiarioSede); */

  const rankingAgenteSede = await getRankingAgentesPorSede(id);
  //console.log(rankingAgenteSede);

  const rankingGlobalAgente = await getRankingGlobalAgentes();
  //console.log(rankingGlobalAgente);

  const rankingGlobalCerrador = await getRankingGlobalSupervisor();
  //console.log(rankingGlobalCerrador);

  const sedesStatsDiario = await getSedesStatsDiario();

  const sede = await getSede(id);

  const rankingRango = await getRangofechaRanking();

  return (
    <RankingUI 
      sedeOrigin={sede}
      rankingAgenteSede={rankingAgenteSede ?? []}
      rankingGlobalAgente={rankingGlobalAgente ?? []}
      rankingGlobalCerrador={rankingGlobalCerrador ?? []}
      sedesStatsDiario={sedesStatsDiario}
      rankingRango={rankingRango}
    />
  )
}