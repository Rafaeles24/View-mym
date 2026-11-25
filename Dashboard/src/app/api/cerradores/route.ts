import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiUrl = process.env.BACKEND_INTERNAL_URL;

  if (!apiUrl) {
    return NextResponse.json(
      { message: "Backend no configurado" },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "JSON inválido" },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof (body as { nombre?: unknown }).nombre !== "string"
  ) {
    return NextResponse.json(
      { message: "El nombre del cerrador es obligatorio" },
      { status: 400 },
    );
  }

  const nombre = (body as { nombre: string }).nombre
    .trim()
    .replace(/\s+/g, " ");

  if (!nombre) {
    return NextResponse.json(
      { message: "El nombre del cerrador es obligatorio" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/system/api/cerrador/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre }),
        cache: "no-store",
      },
    );

    const result = await response.json().catch(() => null);

    return NextResponse.json(
      result ?? {
        message: response.ok
          ? "Cerrador creado"
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
