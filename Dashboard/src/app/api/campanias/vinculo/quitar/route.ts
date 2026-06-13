import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest
) {
  try {
    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/campaign/delete/medias`, {
      method: "PATCH",
      headers: {
        "Content-type" : "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      {message: "Error en subir los archivos"},
      {status: 500}
    )
  }
}