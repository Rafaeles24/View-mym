import type { Versus, VersusInput } from '@/types/versus';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_BACKEND_API_URL no está configurada');
  }

  const response = await fetch(`${API_URL}/system/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(result?.message)
      ? result.message.join(', ')
      : result?.message ?? 'No se pudo completar la operación';
    throw new Error(message);
  }

  return result as T;
}

export function crearVersus(data: VersusInput): Promise<Versus> {
  return request('/versus/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function actualizarVersus(
  id: number,
  data: VersusInput,
): Promise<Versus> {
  return request(`/versus/update/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function eliminarVersus(id: number): Promise<{ message: string }> {
  return request(`/versus/${id}`, { method: 'DELETE' });
}
