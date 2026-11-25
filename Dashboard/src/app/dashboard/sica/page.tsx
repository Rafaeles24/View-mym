import SicaUI from "@/components/sica/ui";
import type { SeguimientoReconciliacionSica } from "@/types/sica";

async function obtenerEstadoInicial(): Promise<{
  seguimiento: SeguimientoReconciliacionSica | null;
  error: string | null;
}> {
  const apiUrl = process.env.BACKEND_INTERNAL_URL;

  if (!apiUrl) {
    return {
      seguimiento: null,
      error: "Backend no configurado",
    };
  }

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/system/api/sica/reconciliar/estado`,
      { cache: "no-store" },
    );
    const result: unknown = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      const message =
        result &&
        typeof result === "object" &&
        "message" in result
          ? (result as { message?: unknown }).message
          : null;

      return {
        seguimiento: null,
        error:
          typeof message === "string"
            ? message
            : "No se pudo consultar el estado de SICA",
      };
    }

    return {
      seguimiento:
        result as SeguimientoReconciliacionSica,
      error: null,
    };
  } catch {
    return {
      seguimiento: null,
      error: "No se pudo conectar con el backend",
    };
  }
}

export default async function SicaPage() {
  const estadoInicial = await obtenerEstadoInicial();

  return (
    <SicaUI
      seguimientoInicial={estadoInicial.seguimiento}
      errorEstadoInicial={estadoInicial.error}
    />
  );
}
