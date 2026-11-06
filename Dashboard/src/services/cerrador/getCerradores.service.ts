import { Cerrador } from "@/types/cerrador";

const API_URL = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL;

async function getCerradores(activo: number): Promise<Cerrador[]> {
  if (!API_URL) {
    throw new Error('API_URL is not defined');
  }

  const response = await fetch(`${API_URL}/system/api/cerrador?activos=${activo}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching cerradores: ${response.status}`);
  }

  const data = await response.json();
  return data as Cerrador[];
}

export function getCerradoresActivos() {
  return getCerradores(1);
}

export function getCerradoresInactivos() {
  return getCerradores(0);
}
