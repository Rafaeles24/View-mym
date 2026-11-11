import type { Versus } from '@/types/versus';

const API_URL =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function getVersus(): Promise<Versus[]> {
  if (!API_URL) {
    throw new Error('API_URL no está configurada');
  }

  const response = await fetch(`${API_URL}/system/api/versus`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`No se pudieron obtener los versus: ${response.status}`);
  }

  return (await response.json()) as Versus[];
}
