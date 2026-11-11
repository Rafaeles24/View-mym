import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoEmpleado } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VersusConfigService } from 'src/versus-config/versus-config.service';
import {
  CreateVersusDto,
  VersusParticipanteDto,
} from './dto/create-versus.dto';
import { UpdateVersusDto } from './dto/update-versus.dto';

@Injectable()
export class VersusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configVersus: VersusConfigService,
  ) {}

  private async validarParticipantes(
    participantes: VersusParticipanteDto[],
  ): Promise<void> {
    if (!Array.isArray(participantes) || participantes.length < 2) {
      throw new BadRequestException(
        'El enfrentamiento debe tener al menos dos participantes',
      );
    }

    const cerradorIds = participantes.map((item) => item.cerrador_id);
    const idsUnicos = new Set(cerradorIds);

    if (idsUnicos.size !== participantes.length) {
      throw new BadRequestException(
        'Un cerrador no puede repetirse dentro del mismo enfrentamiento',
      );
    }

    const equipos = [...new Set(participantes.map((item) => item.equipo))].sort(
      (a, b) => a - b,
    );

    if (
      equipos.length < 2 ||
      equipos.some((numero, index) => numero !== index + 1)
    ) {
      throw new BadRequestException(
        'El enfrentamiento debe tener al menos dos equipos consecutivos, comenzando en 1',
      );
    }

    const posiciones = new Set<string>();

    for (const participante of participantes) {
      const posicion = `${participante.equipo}:${participante.orden}`;

      if (posiciones.has(posicion)) {
        throw new BadRequestException(
          'El orden de cada participante debe ser único dentro de su equipo',
        );
      }

      posiciones.add(posicion);
    }

    const cerradoresActivos = await this.prisma.cerrador.count({
      where: {
        id: { in: [...idsUnicos] },
        activo: true,
      },
    });

    if (cerradoresActivos !== idsUnicos.size) {
      throw new BadRequestException(
        'Todos los cerradores deben existir y estar activos',
      );
    }
  }

  private readonly participantesInclude = {
    orderBy: [{ equipo: 'asc' as const }, { orden: 'asc' as const }],
    include: {
      cerrador: true,
    },
  };

  async crear(dto: CreateVersusDto) {
    await this.validarParticipantes(dto.participantes);

    return this.prisma.versus.create({
      data: {
        nombre: dto.nombre.trim(),
        activo: dto.activo ?? true,
        participantes: {
          create: dto.participantes,
        },
      },
      include: {
        participantes: this.participantesInclude,
      },
    });
  }

  async listar() {
    return this.prisma.versus.findMany({
      include: {
        participantes: this.participantesInclude,
      },
      orderBy: { id: 'desc' },
    });
  }

  async obtenerPorId(id: number) {
    const versus = await this.prisma.versus.findUnique({
      where: { id },
      include: {
        participantes: this.participantesInclude,
      },
    });

    if (!versus) {
      throw new NotFoundException('El enfrentamiento no existe');
    }

    return versus;
  }

  async actualizar(id: number, dto: UpdateVersusDto) {
    await this.obtenerPorId(id);

    if (dto.nombre !== undefined && !dto.nombre.trim()) {
      throw new BadRequestException('El nombre no puede estar vacío');
    }

    if (dto.participantes !== undefined) {
      await this.validarParticipantes(dto.participantes);
    }

    return this.prisma.versus.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.participantes !== undefined && {
          participantes: {
            deleteMany: {},
            create: dto.participantes,
          },
        }),
      },
      include: {
        participantes: this.participantesInclude,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtenerPorId(id);
    await this.prisma.versus.delete({ where: { id } });

    return { message: 'Enfrentamiento eliminado' };
  }

  async obtenerResultado(id: number) {
    const versus = await this.obtenerPorId(id);

    if (!versus.activo) {
      throw new NotFoundException('El enfrentamiento no está activo');
    }

    const { config } = await this.configVersus.obtenerRangoVigente();
    const ids = versus.participantes.map((item) => item.cerrador_id);
    const ventas = await this.prisma.venta.groupBy({
      by: ['cerrador_id'],
      where: {
        tipo_empleado: TipoEmpleado.CERRADOR,
        cerrador_id: { in: ids },
        fecha_tramitacion: {
          gte: config.fecha_inicio,
          lt: config.fecha_fin,
        },
      },
      _count: { id: true },
      _min: { fecha_tramitacion: true },
    });

    const ventasPorCerrador = new Map(
      ventas
        .filter((item) => item.cerrador_id !== null)
        .map((item) => [
          item.cerrador_id as number,
          {
            ventas: item._count.id,
            primeraVenta: item._min.fecha_tramitacion,
          },
        ]),
    );

    const numerosEquipo = [
      ...new Set(versus.participantes.map((item) => item.equipo)),
    ].sort((a, b) => a - b);
    const equipos = numerosEquipo.map((numero) => {
      const miembros = versus.participantes.filter(
        (item) => item.equipo === numero,
      );
      const datos = miembros.map(
        (item) =>
          ventasPorCerrador.get(item.cerrador_id) ?? {
            ventas: 0,
            primeraVenta: null,
          },
      );

      return {
        numero,
        ventas: datos.reduce((total, item) => total + item.ventas, 0),
        primera_venta:
          datos
            .map((item) => item.primeraVenta)
            .filter((fecha): fecha is Date => fecha !== null)
            .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
        participantes: miembros.map((item) => {
          const dato = ventasPorCerrador.get(item.cerrador_id);

          return {
            id: item.cerrador.id,
            nombre: item.cerrador.nombre,
            orden: item.orden,
            ventas: dato?.ventas ?? 0,
            primera_venta: dato?.primeraVenta ?? null,
          };
        }),
      };
    });

    let equipoLider: number | null = null;
    const ventasMaximas = Math.max(...equipos.map((equipo) => equipo.ventas));
    let candidatos = equipos.filter(
      (equipo) => equipo.ventas === ventasMaximas,
    );

    if (candidatos.length === 1) {
      equipoLider = candidatos[0].numero;
    } else if (candidatos.every((equipo) => equipo.primera_venta !== null)) {
      const primeraFecha = Math.min(
        ...candidatos.map((equipo) => equipo.primera_venta.getTime()),
      );
      candidatos = candidatos.filter(
        (equipo) => equipo.primera_venta.getTime() === primeraFecha,
      );
      equipoLider = candidatos.length === 1 ? candidatos[0].numero : null;
    }

    const ventasOrdenadas = equipos
      .map((equipo) => equipo.ventas)
      .sort((a, b) => b - a);

    return {
      id: versus.id,
      nombre: versus.nombre,
      rango: {
        fecha_inicio: config.fecha_inicio,
        fecha_fin: config.fecha_fin,
        zona_horaria: config.zona_horaria,
      },
      equipos: equipos.map((equipo) => ({
        ...equipo,
        lider: equipo.numero === equipoLider,
      })),
      resultado: {
        estado: equipoLider === null ? ('EMPATE' as const) : ('LIDER' as const),
        equipo_lider: equipoLider,
        diferencia: ventasOrdenadas[0] - ventasOrdenadas[1],
      },
    };
  }

  async listarResultados() {
    const enfrentamientos = await this.prisma.versus.findMany({
      where: { activo: true },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return Promise.all(
      enfrentamientos.map((versus) => this.obtenerResultado(versus.id)),
    );
  }
}
