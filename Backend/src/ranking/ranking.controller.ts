import { BadRequestException, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024,
        files: 1, 
      },
      fileFilter: (req, file, cb) => {
        const isExcelFile = /\.(xlsx|xls)$/i.test(file.originalname);

        if (!isExcelFile) {
          return cb(
            new BadRequestException('Solo se permiten archivos Excel (.xlsx, .xls).'),
            false,
          );
        }

        cb(null, true);
      }
    })
  )
  processExcelFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo.');
    }

    return this.rankingService.transformExcelToJson(file);
  }

  @Get('actual')
  getRankingActual() {
    return this.rankingService.getRankingActual();
  }
}
