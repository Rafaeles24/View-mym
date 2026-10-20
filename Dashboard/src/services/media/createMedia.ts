export async function createMedia(
  files: File[]
): Promise<{
  message?: string;
  statusCode?: number;
  data?: unknown
}> {

  if (files.length === 0) throw new Error(`Debes seleccionar almenos un archivo`);

  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/system/api/media/create`, {
    method: 'POST',
    credentials: "include",
    body: formData
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? `No se pudo subir los archivos (${response.status})`;
  
    throw new Error(Array.isArray(message) ? message.join(", ") : String(message));
  }

  return data;
}