import { NextResponse } from "next/server";

export async function reenviarSolicitudSica(
  path: string,
  init?: RequestInit,
) {
  const apiUrl = process.env.BACKEND_INTERNAL_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { message: "Backend no configurado" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/system/api/sica/${path}`,
      {
        ...init,
        cache: "no-store",
      },
    );
    const text = await response.text();
    let result: unknown = null;

    if (text) {
      try {
        result = JSON.parse(text);
      } catch {
        result = { message: text };
      }
    }

    return NextResponse.json(
      result ?? {
        message: response.ok
          ? "Operación completada"
          : "Error del backend",
      },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el backend" },
      { status: 502 },
    );
  }
}
