import type {
  Cerrador,
  UpdateCerrador,
} from "@/types/cerrador";

const API_URL = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function actualizarCerrador(
  id: number,
  data: UpdateCerrador,
): Promise<Cerrador> {
  const response = await fetch(`${API_URL}/system/api/cerrador/update/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje = Array.isArray(result?.message)
      ? result.message.join(", ")
      : result?.message || "No se pudo actualizar el cerrador";

    throw new Error(mensaje);
  }

  return result as Cerrador;
}

export async function cambiarEstadoCerrador(
  id: number,
  activo: boolean,
): Promise<Cerrador> {
  return actualizarCerrador(id, {
    activo,
  });
}