const API_URL = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL;


export async function actualizarAvatarCerrador(
  id: number,
  archivo: File,
): Promise<void> {
  const formData = new FormData();

  formData.append("file", archivo);

  const response = await fetch(
    `${API_URL}/system/api/cerrador/update-avatar/${id}`,
    {
      method: "PATCH",
      body: formData,
    },
  );

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(
      obtenerMensajeError(result, "Error al actualizar avatar"),
    );
  }
}