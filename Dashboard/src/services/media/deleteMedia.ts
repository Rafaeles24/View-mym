export async function deleteMedia(
  payload: {
    id: number
  }
) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/system/api/media/delete`, {
    method: 'DELETE',
    headers: {
      "content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "No se pudo eliminar la media")
  };

  return data;
}