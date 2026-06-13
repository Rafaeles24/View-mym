import { Controller, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post('/asesor/upsert')
  @UseInterceptors(FileInterceptor('file'))
  excelUpload(@UploadedFile() file: Express.Multer.File) {
    return this.excelService.createUsersFromExcel(file);
  }

  
}
