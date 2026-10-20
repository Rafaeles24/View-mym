import { PaginationMedia } from "@/types/media";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest
) {
  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams(searchParams);

  if (!query.has("page")) query.set("page", "1");
  if (!query.has("limit")) query.set("limit", "50");

  try {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/colaborador?${query}`, {
      cache: "no-store"
    });

    const data: PaginationMedia = await res.json();

    return NextResponse.json(data, { status: res.status });

  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener colaboradores" },
      { status: 500 }
    )
  }
}