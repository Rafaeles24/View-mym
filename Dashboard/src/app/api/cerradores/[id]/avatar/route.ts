import {
  NextRequest,
  NextResponse,
} from "next/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const { id } = await params;

  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return NextResponse.json(
      { message: "ID de cerrador inválido" },
      { status: 400 },
    );
  }

  const API_URL = process.env.BACKEND_API_URL;

  if (!API_URL) {
    return NextResponse.json(
      { message: "BACKEND_API_URL no configurada" },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();

    // Debe coincidir con FileInterceptor("file")
    const archivo = formData.get("file");

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { message: "Debes seleccionar una imagen" },
        { status: 400 },
      );
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      return NextResponse.json(
        { message: "Formato de imagen no permitido" },
        { status: 400 },
      );
    }

    if (archivo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "La imagen no debe superar los 5 MB" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${API_URL.replace(/\/$/, "")}/system/api/cerrador/update-avatar/${id}`,
      {
        method: "PATCH",
        body: formData,
        cache: "no-store",
      },
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        result ?? { message: "Error al actualizar avatar" },
        { status: response.status },
      );
    }

    return NextResponse.json(
      result ?? { message: "Avatar actualizado correctamente" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar el avatar" },
      { status: 500 },
    );
  }
}