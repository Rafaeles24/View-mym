"use client";

import { SedeMedia } from "@/types/media";
import { RankingList, RankingRangoFecha } from "@/types/ranking";
import { Sede } from "@/types/sede";
import { SedeStats } from "@/types/stats";
import ViewRotator from "../viewRotator/ui";
import RankingUI from "../ranking/ui";
import PlayerUI from "../player/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { socket } from "@/lib/socket";
import TimeUI from "../time/ui";
import { Time } from "@/types/time";
import VentasResumenUI from "../resumenVentasGlobal/ui";
import { ResumenVentas } from "@/types/resumenVenta";
import VersusUI from "@/components/versus/ui";
import { VersusRangoFecha, VisorVersus } from "@/types/versus";


const DEFAULT_RANKING_DURATION = 5 * 60 * 1000;
const VERSUS_PAGE_SIZE = 4;
const VERSUS_PAGE_DURATION_MS = 60_000;

export default function SedeViews({
  sede,
  sedeMedia,
  
  rankingAgenteSede,
  rankingGlobalAgente,
  rankingGlobalCerrador,

  sedesStatsDiario,
  rankingRango,
  versusRango,
  visorResumenDiario,
  visorResumenAyer,

  rankingDurationMs = DEFAULT_RANKING_DURATION,

  visorVersus,
  time,
} : {
  sede: Sede;
  sedeMedia: SedeMedia | null;
  
  rankingAgenteSede: RankingList[];
  rankingGlobalAgente: RankingList[];
  rankingGlobalCerrador: RankingList[];

  sedesStatsDiario: SedeStats;
  rankingRango: RankingRangoFecha;
  versusRango: VersusRangoFecha;
  
  visorResumenDiario: ResumenVentas;
  visorResumenAyer: ResumenVentas;

  rankingDurationMs?: number;
  visorVersus: VisorVersus[];
  time: Time;
}) {

  const router = useRouter();

  const versusPages = Math.ceil(
    visorVersus.length | VERSUS_PAGE_SIZE
  );

  const versusDurationMs = versusPages * VERSUS_PAGE_DURATION_MS;

  useEffect(() => {
    if (!sede.id) {
      return;
    }

    const payload = { sedeId: sede.id };

    const joinSede = () => {
      socket.emit("join-sede", payload);

      console.log(
        "[SOCKET] join-sede EMITIDO",
        new Date().toISOString()
      );
    }

    if ( socket.connected ) {
      joinSede();
    }

    /*
     * Socket.IO puede reconectarse.
     * En ese caso hay que volver
     * a entrar al room.
     */
    socket.on( "connect", joinSede);

    return () => {
      socket.off( "connect", joinSede);

      if ( socket.connected ) {
        socket.emit("leave-sede", payload);

        console.log(
          "[SOCKET] leave-sede EMITIDO",
          new Date().toISOString()
        );
      }
    };

  }, [ sede.id ]);

  useEffect(() => {
    let refreshProgramado:
      | ReturnType<typeof setTimeout>
      | null = null;

    function handleRankingRefresh() {
      console.log(
        "[SOCKET] ranking:refresh RECIBIDO",
        new Date().toISOString()
      );

      /*
       * Si llegan varios eventos juntos,
       * ejecutamos un solo router.refresh().
       */
      if (refreshProgramado !== null) {
        return;
      }

      refreshProgramado = setTimeout(() => {
        refreshProgramado = null;

        console.log(
          "[NEXT] router.refresh() por ranking"
        );

        router.refresh();
      }, 100);
    }

    socket.on(
      "ranking:refresh",
      handleRankingRefresh
    );

    return () => {
      socket.off(
        "ranking:refresh",
        handleRankingRefresh
      );

      if (refreshProgramado !== null) {
        clearTimeout(refreshProgramado);
      }
    };
  }, [router]);

  return (
    <ViewRotator
      views={[
        ...(visorVersus.length > 0 ? [
          {
            id: "versus",
            type: "timed" as const,
            durationMs: versusDurationMs,
            render: (
              <VersusUI
                data={visorVersus}
                durationMs={60000}
                sedeOrigin={sede}
                versusRango={versusRango}
              />
            )
          }
        ]: []),
        /* {
          id: "resumen-global",
          type: "timed",
          durationMs: rankingDurationMs,
          render: (
            <VentasResumenUI
              sedeOrigin={sede}
              rankingRango={rankingRango}
              hoy={visorResumenDiario}
              ayer={visorResumenAyer}
            />
          )
        },*/
        {
          id: "ranking",
          type: "timed",
          durationMs: rankingDurationMs,
          render: (
            <RankingUI
              sedeOrigin={sede}
              rankingAgenteSede={rankingAgenteSede}
              rankingGlobalAgente={rankingGlobalAgente}
              rankingGlobalCerrador={rankingGlobalCerrador}
              sedesStatsDiario={sedesStatsDiario}
              rankingRango={rankingRango}
            />
          )
        },
        ...( sedeMedia?.medias?.length
          ? [
              {
                id: "player",
                type: "controlled" as const,
                render: ( onComplete: () => void, isActive: boolean ) => (
                  <PlayerUI
                    sede={sedeMedia}
                    onComplete={onComplete}
                    isActive={isActive}
                  />
                )
              }
          ] : []
        ),
        {
          id: "time",
          type: "timed",
          durationMs: 0.5 * 60 * 1000,
          render: (
            <TimeUI time={time} />
          )
        },  
      ]}
    />
  );

}