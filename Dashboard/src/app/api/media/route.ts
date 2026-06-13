import { PaginationMedia } from "@/types/cardMedia";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest
) {
  try {
    const formData = await req.formData();
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/media/create`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    return NextResponse.json(
      {message: "Error en subir los archivos"},
      {status: 500}
    )
  }
}

export async function GET(
  req: NextRequest
) {

  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams(searchParams);

  if (!query.has("page")) {
    query.set("page", "1");
  }

  if (!query.has("limit")) {
    query.set("limit", "50");
  }

  try {
      const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/media?${query}`, {
        cache: "no-store"
      });

      const data: PaginationMedia = await res.json();
    
      return NextResponse.json(data, {status: res.status});
  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener media" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest
) {
  try {
    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/media/delete`, {
      method: "DELETE",
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