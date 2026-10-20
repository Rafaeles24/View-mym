import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { DateTime } from "luxon";

export const ZONA_LIMA = 'America/Lima';
export const ZONA_MADRID = 'Europe/Madrid';

export function obtenerDiaLima(
  fecha?: string,
): DateTime {
  if (!fecha) 
    return DateTime.now().setZone(ZONA_LIMA).startOf('day');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new BadRequestException(`La fecha debe tener el formato YYYY-MM-DD`);

  const resultado = DateTime.fromISO(fecha, { zone: ZONA_LIMA });

  if (!resultado.isValid || resultado.toISODate() !== fecha) 
    throw new BadRequestException(`La fecha proporcionada no es valida`);

  return resultado.startOf('day');
}

export function fechaLimaParaBD(
  fecha: DateTime
): Date {
  const local = fecha.setZone(ZONA_LIMA);

  if (!local.isValid)
    throw new InternalServerErrorException(`Fecha Lima invalidada para consulta`);

  return local.setZone('UTC', { keepLocalTime: true }).toJSDate();
}

export function fechaBDComoLima(
  fecha: Date
): DateTime {
  return DateTime.fromJSDate(fecha, { zone: 'UTC' }).setZone(ZONA_LIMA, { keepLocalTime: true });
}

export function obtenerDiferenciaMadridLima(
  fecha: DateTime,
): number {
  const lima = fecha.setZone(ZONA_LIMA);
  const madrid = fecha.setZone(ZONA_MADRID);

  return (madrid.offset - lima.offset) / 60;
} 