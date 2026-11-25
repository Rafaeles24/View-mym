import type {
  InicioReconciliacionSica,
  ResultadoSincronizacionSica,
  SeguimientoReconciliacionSica,
} from "@/types/sica";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/sica${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

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

    throw new Error(
      Array.isArray(message)
        ? message.map(String).join(", ")
        : typeof message === "string"
          ? message
          : "No se pudo completar la operación con SICA",
    );
  }

  return result as T;
}

export function sincronizarSica() {
  return request<ResultadoSincronizacionSica>("/sync", {
    method: "POST",
  });
}

export function reconciliarSica(
  inicio: string,
  fin: string,
) {
  return request<InicioReconciliacionSica>("/reconciliar", {
    method: "POST",
    body: JSON.stringify({ inicio, fin }),
  });
}

export function obtenerEstadoReconciliacionSica() {
  return request<SeguimientoReconciliacionSica>(
    "/reconciliar/estado",
  );
}
