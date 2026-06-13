// optimize.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join, extname, parse } from 'path';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const execFileAsync = promisify(execFile);

type UploadFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class OptimizeService {
  async optimizeFiles(files: UploadFile[]): Promise<UploadFile[]> {
    // Ojo: si subes muchos videos pesados a la vez, mejor limitar concurrencia.
    return Promise.all(files.map(file => this.optimizeFile(file)));
  }

  private async optimizeFile(file: UploadFile): Promise<UploadFile> {
    if (file.mimetype.startsWith('image/')) {
      return this.optimizeImage(file);
    }

    if (file.mimetype.startsWith('video/')) {
      return this.optimizeVideo(file);
    }

    return file;
  }

  private async optimizeImage(file: UploadFile): Promise<UploadFile> {
    try {
      const metadata = await sharp(file.buffer).metadata();

      const needsResize =
        (metadata.width && metadata.width > 1920) ||
        (metadata.height && metadata.height > 1080);

      const optimizedBuffer = await sharp(file.buffer)
        .rotate()
        .resize({
          width: 1920,
          height: 1080,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
          effort: 5,
        })
        .toBuffer();

      // Si no necesitaba resize y el WebP pesa más, conserva el original.
      if (!needsResize && optimizedBuffer.length >= file.buffer.length) {
        return file;
      }

      const baseName = parse(file.filename).name;

      return {
        buffer: optimizedBuffer,
        filename: `${baseName}.webp`,
        mimetype: 'image/webp',
        size: optimizedBuffer.length,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error optimizando imagen ${file.filename}: ${error}`,
      );
    }
  }

  private async optimizeVideo(file: UploadFile): Promise<UploadFile> {
    const id = randomUUID();
    const inputPath = join(tmpdir(), `${id}_input${extname(file.filename) || '.tmp'}`);
    const outputPath = join(tmpdir(), `${id}.mp4`);

    try {
      await fs.writeFile(inputPath, file.buffer);

      const metadata = await this.getVideoMetadata(inputPath);

      const needsResize =
        metadata.width > 1920 ||
        metadata.height > 1080;

      await execFileAsync(
        ffmpegPath!,
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',

          '-i',
          inputPath,

          // Video principal y audio opcional
          '-map',
          '0:v:0',
          '-map',
          '0:a?',

          // Máximo 1920x1080, mantiene proporción y evita dimensiones impares
          '-vf',
          "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos:in_range=auto:out_range=tv,format=yuv420p,setsar=1",
          '-colorspace',
          'bt709',
                  
          '-color_primaries',
          'bt709',
                  
          '-color_trc',
          'bt709',
                  
          '-color_range',
          'tv',

          // Códec compatible con navegadores
          '-c:v',
          'libx264',

          // Calidad: menor CRF = más calidad y más peso.
          // 23 es equilibrado; 20 mejor calidad; 26 más compresión.
          '-crf',
          '23',

          // medium comprime mejor que fast, pero demora más.
          '-preset',
          'medium',

          // Compatibilidad web
          '-pix_fmt',
          'yuv420p',

          // Permite reproducción progresiva en navegador
          '-movflags',
          '+faststart',

          // Audio
          '-c:a',
          'aac',
          '-b:a',
          '128k',

          outputPath,
        ],
      );

      const optimizedBuffer = await fs.readFile(outputPath);

      // Si no necesitaba resize y terminó pesando más, conserva el original.
      if (!needsResize && optimizedBuffer.length >= file.buffer.length) {
        return file;
      }

      const baseName = parse(file.filename).name;

      return {
        buffer: optimizedBuffer,
        filename: `${baseName}.mp4`,
        mimetype: 'video/mp4',
        size: optimizedBuffer.length,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error optimizando video ${file.filename}: ${error}`,
      );
    } finally {
      await fs.rm(inputPath, { force: true }).catch(() => null);
      await fs.rm(outputPath, { force: true }).catch(() => null);
    }
  }

  private async getVideoMetadata(path: string): Promise<{
    width: number;
    height: number;
  }> {
    const { stdout } = await execFileAsync(
      ffprobeStatic.path,
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'json',
        path,
      ],
    );

    const json = JSON.parse(stdout);
    const stream = json.streams?.[0];

    return {
      width: Number(stream?.width ?? 0),
      height: Number(stream?.height ?? 0),
    };
  }
}