import { NextResponse } from "next/server";

import { reenviarSolicitudSica } from "../backend";

export async function POST(request: Request) {
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
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { message: "El rango de fechas es obligatorio" },
      { status: 400 },
    );
  }

  const { inicio, fin } = body as {
    inicio?: unknown;
    fin?: unknown;
  };

  if (
    typeof inicio !== "string" ||
    typeof fin !== "string"
  ) {
    return NextResponse.json(
      { message: "Las fechas de inicio y fin son obligatorias" },
      { status: 400 },
    );
  }

  return reenviarSolicitudSica("reconciliar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inicio, fin }),
  });
}
