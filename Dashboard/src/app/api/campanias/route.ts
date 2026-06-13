import { CampaignOptions } from "@/types/campaign";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/campaign`, {
      cache: "no-store"
    });
    const data: CampaignOptions[] = await res.json();
  
    return NextResponse.json(data, {status: res.status});
  } catch (error) {
    return NextResponse.json(
      { message: "Error al obtener campanias" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/campaign/add/medias`, {
      method: "POST",
      headers: {
        "Content-type" : "application/json"
      },
      body: JSON.stringify(body)
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