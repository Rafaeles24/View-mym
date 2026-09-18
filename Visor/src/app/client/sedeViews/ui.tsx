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


const DEFAULT_RANKING_DURATION = 2 * 60 * 1000;

export default function SedeViews({
  sede,
  sedeMedia,
  
  rankingAgenteSede,
  rankingGlobalAgente,
  rankingGlobalCerrador,

  sedesStatsDiario,
  rankingRango,

  rankingDurationMs = DEFAULT_RANKING_DURATION,

  time,
} : {
  sede: Sede;
  sedeMedia: SedeMedia | null;
  
  rankingAgenteSede: RankingList[];
  rankingGlobalAgente: RankingList[];
  rankingGlobalCerrador: RankingList[];

  sedesStatsDiario: SedeStats;
  rankingRango: RankingRangoFecha;
  rankingDurationMs?: number;
  time: Time;
}) {

  const router = useRouter();

    useEffect(() => {
      if (!sede.id) {
        return;
      }

      const payload = {
        sedeId:
          sede.id,
      };

      const joinSede =
        () => {
          console.log(
          "[SOCKET] sede:join",
          payload,
          new Date().toISOString()
        );

        socket.emit(
          "sede:join",
          payload,
        );
      };

    if (
      socket.connected
    ) {
      joinSede();
    }

    /*
     * Socket.IO puede reconectarse.
     * En ese caso hay que volver
     * a entrar al room.
     */
    socket.on(
      "connect",
      joinSede,
    );

    return () => {
      if (
        socket.connected
      ) {
        socket.emit(
          "sede:leave",
          payload,
        );
      }

      socket.off(
        "connect",
        joinSede,
      );
    };
  }, [
    sede.id,
  ]);

  useEffect(() => {
    const joinRanking = () => {
      console.log(
        "[SOCKET] join-ranking",
        socket.id
      );

      socket.emit("join-ranking");
    };

    if (socket.connected) {
      joinRanking();
    }

    socket.on("connect", joinRanking);

    return () => {
      if (socket.connected) {
        socket.emit("leave-ranking");
      }

      socket.off("connect", joinRanking);
    };
  }, []);

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