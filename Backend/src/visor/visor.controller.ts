import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, DefaultValuePipe, ParseEnumPipe } from '@nestjs/common';
import { VisorService } from './visor.service';
import { TipoEmpleado } from '@prisma/client';

@Controller('visor')
export class VisorController {
  constructor(private readonly visorService: VisorService) {}

  //SEDES
  
  @Get('sede/:sedeId')
  getSede(
    @Param('sedeId') sedeId: number
  ) {
    return this.visorService.getSede(sedeId);
  }

  //RANKING

  @Get('stats/sede')
  statsPorSede(
    @Query(
      'tipo_empleado',
      new DefaultValuePipe(TipoEmpleado.AGENTE),
      new ParseEnumPipe(TipoEmpleado)
    ) TipoEmpleado: TipoEmpleado
  ) {
    return this.visorService.statsDiarioPorSede(TipoEmpleado);
  }

  @Get('ranking/diario/agentes/:sedeId')
  rankingDiarioAsesoresPorSede(
    @Param('sedeId') sedeId: number
  ) {
    return this.visorService.getRankingDiarioDeAsesoresPorSede(sedeId);
  }

  @Get('ranking/agentes/:sedeId')
  rankingAsesoresPorSede(
    @Param('sedeId') sedeId: number
  ) {
    return this.visorService.leaderboardAgentesPorSede(sedeId);
  }

  @Get('ranking/global/cerrador')
  rankingCerrador() {
    return this.visorService.leaderboardCerradores();
  }

  @Get('ranking/global/agente')
  rankingAgente() {
    return this.visorService.leaderboardAgentes();
  }

  @Get('ranking/rango') 
  getRankingRango() {
    return this.visorService.obtenerRangoRanking();
  }

  @Get('media/:sedeId')
  getMediaPorSede(
    @Param('sedeId') sedeId: number
  ) {
    return this.visorService.flyersPorSede(sedeId);
  }
}
