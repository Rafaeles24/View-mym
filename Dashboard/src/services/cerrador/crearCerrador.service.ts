import type {
  Cerrador,
  CreateCerrador,
} from "@/types/cerrador";

export async function crearCerrador(
  data: CreateCerrador,
): Promise<Cerrador> {
  const response = await fetch("/api/cerradores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const mensaje = Array.isArray(result?.message)
      ? result.message.join(", ")
      : result?.message || "No se pudo crear el cerrador";

    throw new Error(mensaje);
  }

  return result as Cerrador;
}
