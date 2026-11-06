import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return NextResponse.json(
      { message: "ID de cerrador inválido" },
      { status: 400 },
    );
  }

  const API_URL = process.env.BACKEND_INTERNAL_URL;

  if (!API_URL) {
    return NextResponse.json(
      { message: "Backend no configurado" },
      { status: 500 },
    );
  }

  let body: {
    nombre?: unknown;
    nombre_normalizado?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON inválido" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { message: "Datos inválidos" },
      { status: 400 },
    );
  }

  const data = {
    ...(typeof body.nombre === "string"
      ? { nombre: body.nombre }
      : {}),
    ...(typeof body.nombre_normalizado === "string"
      ? { nombre_normalizado: body.nombre_normalizado }
      : {}),
  };

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: "No se recibieron campos válidos" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${API_URL.replace(/\/$/, "")}/system/api/cerrador/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        cache: "no-store",
      },
    );

    const result = await response.json().catch(() => null);

    return NextResponse.json(
      result ?? {
        message: response.ok
          ? "Cerrador actualizado"
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