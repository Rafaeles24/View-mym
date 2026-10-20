import { AssignMediaSede } from "@/types/media";

export async function assignMediaToSedes(
  payload: {
    mediaId: number;
    duration?: number;

    sedes: AssignMediaSede[];
  }
) {
  const response = await fetch (`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/system/api/media/sedes/asignar`, {
    method: 'PATCH',
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "No se pudo actualizar la media")
  };

  return data;
}
