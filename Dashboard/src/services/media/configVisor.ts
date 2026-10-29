/* =========================================
   CONFIGURACIÓN HTTP
========================================= */

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL;

const ENDPOINTS = {
  ranking: "/system/api/config-ranking/update",
  versus: "/system/api/versus-config/update",
  intervalo: "/system/api/config-ranking/programacion",
};

/* =========================================
   MÉTODO PATCH
========================================= */

async function patchConfig<T>(
  endpoint: string,
  payload: T
): Promise<void> {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_API_URL no está configurada."
    );
  }

  const response = await fetch(
    `${API_URL.replace(/\/$/, "")}${endpoint}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      credentials: "include",

      body: JSON.stringify(payload),

      cache: "no-store",
    }
  );

  if (!response.ok) {
    let mensaje = `Error HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (typeof data.message === "string") {
        mensaje = data.message;
      } else if (Array.isArray(data.message)) {
        mensaje = data.message.join(", ");
      } else if (typeof data.error === "string") {
        mensaje = data.error;
      }
    } catch {
      // Se conserva el error HTTP original.
    }

    throw new Error(mensaje);
  }
}

/* =========================================
   ACTUALIZAR RANKING
========================================= */

export async function actualizarRanking(
  payload: {
    fecha_inicio: string;
    fecha_fin: string;
  }
): Promise<void> {
  return patchConfig(
    ENDPOINTS.ranking,
    payload
  );
}

/* =========================================
   ACTUALIZAR VERSUS
========================================= */

export async function actualizarVersus(
  payload: {
    fecha_inicio: string;
    fecha_fin: string;
  }
): Promise<void> {
  return patchConfig(
    ENDPOINTS.versus,
    payload
  );
}

/* =========================================
   ACTUALIZAR INTERVALO
========================================= */

export async function actualizarIntervalo(
  payload: {
    intervalo_actualizacion: number;
  }
): Promise<void> {
  return patchConfig(
    ENDPOINTS.intervalo,
    payload
  );
}