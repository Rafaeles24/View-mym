"use client";

import { socket } from "@/lib/socket";
import { useEffect } from "react";

export default function SocketConnection() {
  useEffect(() => {
    function onConnect() {
      console.log(`Socket conectado: ${socket.id}`);
    }

    function onDisconnect(reason: string) {
      console.log(`Socket desconectado: ${reason}`);
    }

    function onConnectError(
      error: Error & {
        description?: unknown;
        context?: unknown;
      }
    ) {
      console.error("Error de conexión al socket:", {
        mensaje: error.message,
        descripcion: error.description,
        contexto: error.context,
        url: process.env.NEXT_PUBLIC_SOCKET_URL,
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  return null;
}