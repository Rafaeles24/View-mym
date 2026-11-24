
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

import { JwtAuthGuard } from 'src/auth/guard/jwtAuthGuard';
import { SicaService } from './sica.service';

export class ReconciliarSicaDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'inicio debe tener formato dd/MM/yyyy',
  })
  inicio!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'fin debe tener formato dd/MM/yyyy',
  })
  fin!: string;
}

@Controller('sica')
export class SicaController {
  constructor(
    private readonly sicaService: SicaService,
  ) {}

  // Sincronización habitual
  @Post('sync')
  sincronizar() {
    return this.sicaService.sincronizar();
  }

  // Reconciliación manual por rango
  //@UseGuards(JwtAuthGuard)
  @Post('reconciliar')
  @HttpCode(HttpStatus.ACCEPTED)
  reconciliar(
    @Body() dto: ReconciliarSicaDto,
  ) {
    return this.sicaService.iniciarReconciliacion(
      dto.inicio,
      dto.fin,
    );
  }

  // Consultar estado de reconciliación
  //@UseGuards(JwtAuthGuard)
  @Get('reconciliar/estado')
  estado() {
    return this.sicaService.obtenerEstadoReconciliacion();
  }
}
