import { AuthResponse } from "@/types/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    const response = NextResponse.json(data, { status: res.status });

    const setCookie = res.headers.get("set-Cookie");

    if (setCookie) {
      response.headers.set("Set-Cookie", setCookie);
    }

    return response;
    
  } catch (error) {
    return NextResponse.json(
      { message: "Error en el login" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/auth/me`, {
      cache: "no-store"
    });

    const data: AuthResponse = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { message: "Error al verificar autenticación" },
      { status: 500 }
    );
  }
}