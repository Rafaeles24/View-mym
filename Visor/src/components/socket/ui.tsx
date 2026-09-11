"use client";

import { socket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SocketConnection() {
  const router = useRouter();

  useEffect(() => {
    function onConnect() {
      console.log(`Socket conectado: ${socket.id}`);
    }

    function onDisconnect(reason: string) {
      console.log(`Socket desconectado: ${reason}`);
    }

    function onConnectError(error: Error & {
      description?: unknown;
      context?: unknown;
    }) {
      console.error("Error de conexion al socket: ", {
        mensaje: error.message,
        descripcion: error.description,
        contexto: error.context,
        url: process.env.NEXT_PUBLIC_SOCKET_URL
      })
    }
    
    function onConfigRankingRefresh() {
      router.refresh();
    }

    function onRankingRefresh() {
      router.refresh();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('ranking:refresh', onRankingRefresh);
    socket.on('ranking-config:sync', onConfigRankingRefresh);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('ranking:refresh', onRankingRefresh);
      socket.off('ranking-config:sync', onConfigRankingRefresh);
      socket.disconnect();
    }
  }, [router]);

  return null;
}