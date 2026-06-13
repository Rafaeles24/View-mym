import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

  private isValidHeader(key: any): boolean {
    if (!key) return false;

    const normalized = String(key).trim().toLowerCase();

    if (!normalized) return false;
    if (normalized.startsWith('__empty')) return false;
    if (normalized.startsWith('unnamed')) return false;

    return true;
  }

  private filterValidHeaders(row: any) {
    const cleanRow: any = {};
    Object.entries(row).forEach(([key, value]) => {
      if (this.isValidHeader(key)) {
        cleanRow[key.trim()] = value;
      }
    });
    return cleanRow;
  }

  private normalizeRowNewUsuario(row: any) {

    const usuarioOCM = row['USUARIO OCM ALTA'] || row['usuario ocm'];

    const tipoUsuario = this.parseUsuarioOCM(usuarioOCM);

    // ❌ si no cumple reglas, se elimina
    if (!usuarioOCM || tipoUsuario === null) {
      return null;
    }

    return {
      dni: row['NÚMERO DE DOC.'] || row['dni'] || null,

      nombre_completo:
        row['NOMBRE COMPLETO'] || row['nombre completo'],

      usuario_ocm: usuarioOCM,

      uci: row['UCI'] || row['uci'] || false, // UCI o no

      sede: row['SEDE'] || row['sede'] || null,

      fecha_inicio: this.formatDate(row['fecha inicio']),
      fecha_fin: this.formatDate(row['fecha fin']),

      campania: row['CAMPAÑA'] || row['campania'] || null,

      supervisor: row['supervisor'] || row['coordinador'] || null,

      tipo_usuario: tipoUsuario
    };
  }

  private normalizeAsistenaciaRow(row: any) {
    const grupo = row.grupo
      .replace(/^EQUIPO\s+/i, "")
      .trim();

    const [left, tipo] = row.campania.split("-").map(p => p.trim());

    const leftParts = left.split(" ");

    const campania = leftParts[0] || "";      
    const sede = leftParts.slice(1).join(" ") || null; 

    const tipoUsuario = tipo || null;

    return {
      campania,
      sede,
      tipoUsuario,
      grupo,
      nombres: row.nombres.trim(),
      usuario: row.usuario.trim(),
      fecha: row.fecha,
      hora: row.hora_peru,
      estado: row.estado
    };
  }

  private formatDate(value: any): string | null {
    if (!value) return null;

    if (typeof value === 'string' && value.includes('/')) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }

    if (!isNaN(value)) {
      const date = XLSX.SSF.parse_date_code(value);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    return value;
  }

  private parseUsuarioOCM(usuario: string) {
    if (!usuario) return { tipo: "SIN TIPO", origen: null, correlativo: null };

    const value = usuario.toLowerCase().trim();

    const match = value.match(/^(capa|usuario)(mym|jazztel)\d+$/);

    if (!match) return { tipo: "SIN TIPO", origen: null, correlativo: null };

    return {
      tipo: match[1] === 'capa' ? 'OJT' : 'ALTA',
      origen: match[2],
      correlativo: Number(match[3]),
    }
  }

  private getUciUsuario(usuario: string | null): boolean {
    if (!usuario) return false;

    const value = usuario.toLowerCase().trim();

    if (value.includes('1')) return true;
    return false;
  }

  private parseExcelDateToDateISO(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (typeof value === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(excelEpoch.getTime() + value * 86400000);
    }

    if (typeof value === "string") {
      const parts = value.split('-');

      if (parts.length !== 3) return null;
      
      let [ a, b, c ] = parts.map(Number);

      const n1 = Number(a);
      const n2 = Number(b);
      const n3 = Number(c);

      if ([n1, n2, n3].some(n => isNaN(n))) return null;

      let year: number;
      let month: number;
      let day: number;

      if (n1 < 100) {
        year = 2000 + n1;
        day = n2;
        month = n3;
      }
      else if (n3 > 1000) {
        year = n3;
        day = n1;
        month = n2;
      }
      else {
        return null;
      }

      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      return new Date(Date.UTC(year, month - 1, day));
    }

    return null;
  }

  private selectHex(tipoUsuario: string) {
    if (tipoUsuario === "OJT") return "#FAFC6D";
    if (tipoUsuario === "ALTA") return "#6DFC98";
    if (tipoUsuario === "UCI") return "#FF5E5E"
    return null;
  }

  async uploadContentNewUserExcel(file: { buffer: Buffer }) {
    try {
      const woorkbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = woorkbook.Sheets[woorkbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: null
      });
      if (!rawData.length) return [];

      return rawData
        .map(row => this.filterValidHeaders(row))
        .map(row => this.normalizeRowNewUsuario(row))
        .filter(row => row !== null);
      
      
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Ocurrio un error al subir el archivo: ${error}`);
    }
    
  }

  async uploadContentAssistenciaExcel(file: { buffer: Buffer }) {
    try {
      const woorkbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = woorkbook.Sheets[woorkbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: null
      });
      if (!rawData.length) return [];

      return rawData
        .map(row => this.filterValidHeaders(row))
        .map(row => this.normalizeAsistenaciaRow(row))
        .filter(row => row !== null);
      
      
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Ocurrio un error al subir el archivo: ${error}`);
    }
    
  }

  async createUsersFromExcel(file: { buffer: Buffer }) {
    try {
      const contentData = await this.uploadContentNewUserExcel(file);

      return await this.prisma.$transaction( async (tx) => {
        for (const row of contentData) {

          const usuarioOCM = row.usuario_ocm.toLowerCase().trim();
          const nombreCompleto = row.nombre_completo.toUpperCase().trim();
          const supervisorNombre = row.supervisor.toUpperCase().trim();
          const fechaInicio = this.parseExcelDateToDateISO(row.fecha_inicio);
          const fechaFin = this.parseExcelDateToDateISO(row.fecha_fin);
          const parsed = this.parseUsuarioOCM(usuarioOCM);

          if (!parsed) throw new BadRequestException(`Usuario OCM invalido: ${row.usuario_ocm}`);

          const tipoNuevo = parsed.tipo;

          let fechaInicioFinal: Date | null = null;
          let fechaFinFinal: Date | null = null;

          if (tipoNuevo === "OJT") {
            if (!fechaInicio || !fechaFin) {
              throw new BadRequestException(`Para usuarios OJT, las fechas de inicio y fin son obligatorias. Usuario: ${row.usuario_ocm}`);
            }

            fechaInicioFinal = fechaInicio;
            fechaFinFinal = fechaFin;

          } else if (tipoNuevo === "ALTA") {
            if (!fechaInicio) {
              throw new BadRequestException(`Para usuarios ALTA, la fecha de inicio es obligatoria. Usuario: ${row.usuario_ocm}`);
            }

            fechaInicioFinal = fechaInicio;
            fechaFinFinal = null;
          }

          let supervisor = await tx.supervisor.findFirst({
            where: { nombre: supervisorNombre }
          });

          if (!supervisor) {
            const campaign = await tx.campaign.findFirst({
              where: { nombre: row.campania }
            });

            if (!campaign) {
              throw new BadRequestException(`La campaña "${row.campania}" no existe para el usuario "${row.usuario_ocm}"`);
            }

            const sede = await tx.sede.findFirst({
              where: { nombre: row.sede }
            });

            if (!sede) {
              throw new BadRequestException(`La sede "${row.sede}" no existe para el usuario "${row.usuario_ocm}"`);
            }

            supervisor = await tx.supervisor.create({
              data: {
                campaign_id: campaign.id,
                sede_id: sede.id,
                nombre: supervisorNombre
              }
            });
          }

          const asesorPorDni = await tx.asesor.findFirst({
            where: { dni: row.dni }
          });

          if ( 
            asesorPorDni &&
            asesorPorDni.tipo === 'OJT' &&
            tipoNuevo === 'ALTA' &&
            asesorPorDni.usuario_ocm !== usuarioOCM
          ) {
            const asesorOJT = asesorPorDni;

            const asesorALTA = await tx.asesor.findUnique({
              where: { usuario_ocm: usuarioOCM }
            });

            const dataToMerge = {
              nro_ventas_total: asesorOJT.nro_ventas_total,
              nro_ventas_semanal: asesorOJT.nro_ventas_semanal,
            };

            if (asesorALTA) {
              await tx.asesor.update({
                where: { id: asesorALTA.id },
                data: {
                  ...dataToMerge,
                  supervisor_id: supervisor.id,
                  nombre: nombreCompleto,
                  tipo: "ALTA",
                  uci: this.getUciUsuario(row.uci),
                  hex: this.selectHex("ALTA"),
                  fecha_inicio: fechaInicioFinal,
                  fecha_fin: null,
                  activo: true, 
                }
              });
            
            } else {
              await tx.asesor.create({
                data: {
                  dni: row.dni,
                  usuario_ocm: usuarioOCM,
                  supervisor_id: supervisor.id,
                  nombre: nombreCompleto,
                  tipo: "ALTA",
                  uci: this.getUciUsuario(row.uci),
                  hex: this.selectHex("ALTA"),
                  fecha_inicio: fechaInicioFinal,
                  fecha_fin: fechaFinFinal,
                  activo: true,
                  ...dataToMerge
                }
              });
            }

            await tx.asesor.delete({
              where: { id: asesorOJT.id }
            });

            continue;
          }

          const asesor = await tx.asesor.findUnique({
            where: { usuario_ocm: usuarioOCM }
          });

          if (!asesor) {
            await tx.asesor.create({
              data: {
                dni: row.dni,
                supervisor_id: supervisor.id,
                usuario_ocm: usuarioOCM,
                tipo: tipoNuevo,
                nombre: nombreCompleto,
                uci: this.getUciUsuario(row.uci),
                hex: this.selectHex(tipoNuevo),
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                activo: true
              }
            });

          } else {
            if (asesor.dni !== row.dni) {
              await tx.asesor.update({
                where: { usuario_ocm: usuarioOCM },
                data: {
                  dni: row.dni,
                  supervisor_id: supervisor.id,
                  tipo: tipoNuevo,
                  nombre: nombreCompleto,
                  uci: this.getUciUsuario(row.uci),
                  hex: this.selectHex(tipoNuevo),
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin,
                  activo: true,

                  nro_ventas_total: 0,
                  nro_ventas_semanal: 0,
                  asistencia: "SIN CONFIRMAR",
                }
              });

              continue;
            }

            const newPayload: any = {};

            if (asesor.supervisor_id !== supervisor.id) {
              newPayload.supervisor_id = supervisor.id;
            }

            if (asesor.nombre !== nombreCompleto) {
              newPayload.nombre = nombreCompleto;
            }

            if (asesor.tipo !== tipoNuevo) {
              if (!(asesor.tipo === "ALTA" && tipoNuevo === "OJT")) {
                newPayload.tipo = tipoNuevo;
                newPayload.hex = this.selectHex(tipoNuevo);
              }
            }

            if (fechaInicioFinal) {
              newPayload.fecha_inicio = fechaInicioFinal;
            }

            if (tipoNuevo === "ALTA") {
              newPayload.fecha_fin = null;
            } else if (fechaFinFinal) {
              newPayload.fecha_fin = fechaFinFinal;
            }


            if (Object.keys(newPayload).length > 0) {
              await tx.asesor.update({
                where: { usuario_ocm: usuarioOCM },
                data: newPayload
              });
            }
          }
        }

        return {
          message: `Usuarios procesados: ${contentData.length}`,
          count: contentData.length,
          statusCode: 201
        }
      });
      
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Ocurrio un error al crear los usuarios: ${error}`);
    }
  }

  async setAssistFromExcel(file: { buffer: Buffer }) {
    try {
      const contentData = await this.uploadContentAssistenciaExcel(file);

      return await this.prisma.$transaction( async (tx) => {
        for (const row of contentData) {
          const campaign  = await tx.campaign.findFirst({
            where: { nombre: row.campania }
          });

          if (!campaign) {
            throw new BadRequestException(`La campaña "${row.campania}" no existe para el registro de asistencia del usuario "${row.usuario}"`);
          }

          const sede = await tx.sede.findFirst({
            where: { nombre: row.sede }
          });

          if (!sede) {
            throw new BadRequestException(`La sede "${row.sede}" no existe para el registro de asistencia del usuario "${row.usuario}"`);
          }

          const supervisor = await tx.supervisor.findFirst({
            where: { 
              nombre: row.grupo
            }
          });

          if (!supervisor) {
            throw new BadRequestException(`El grupo "${row.grupo}" no existe para el registro de asistencia del usuario "${row.usuario}"`);
          }

          const asesor = await tx.asesor.findFirst({
            where: { 
              nombre: row.nombres
            }
          });

          if (!asesor) {
            throw new BadRequestException(`El asesor "${row.nombres}" no existe para el registro de asistencia del usuario "${row.usuario}"`);
          }

          return await tx.asesor.update({
            where: { usuario_ocm: row.usuario },
            data: {
              supervisor_id: supervisor.id,
              tipo: row.tipoUsuario,
              asistencia: `${row.fecha} - ${row.hora}`
            }
          })
        }
      });

    } catch (error) {
      
    }
  }
}
