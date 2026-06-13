import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { promisify } from "util";

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath.path)

@Injectable()
export class FilesService {
    
    private readonly logger = new Logger(FilesService.name);

    async getVideoDuration(filePath: string) : Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    this.logger.error(`Error obteniedo la duracion: ${err}`);
                    return reject(err);
                }

                const durationSec = metadata.format?.duration;

                if (!durationSec) {
                    return reject(`NO se pudo obtener duracion del video.`);
                }

                const durationMs = Math.floor(durationSec * 1000);

                resolve(durationMs);
            });
        });
    }

    async createDir(pathDir: string) {
        const safe = path.normalize(pathDir);
        const dir = path.join('uploads', safe);
        
        await fs.promises.mkdir(dir, { recursive: true });

        return { path: dir };
    }

    async createFiles(
        params: {
            buffer: Buffer,
            filename: string,
            pathDir: string,
            mimetype: string,
        }[]
    ) {
        return await Promise.all(

            params.map( async (param, i) => {

                const safeName = `${Date.now()}-${i}-${param.filename.replace(/\s+/g, '_')}`
                const filePath = `${param.pathDir}/${safeName}`;

                await fs.promises.writeFile(filePath, param.buffer);

                return {
                    filename: safeName, 
                    path: filePath,
                    mimetype: param.mimetype
                }
            })
        )
    }

    async deleteFiles(
        files: {
            path: string;
        }[]
    ) {

        await Promise.all(

            files.map(async (file) => {

                try {

                    await fs.promises.unlink(file.path);
                    
                } catch (error) {

                    // si el archivo no existe no pasa nada
                    if (error.code !== "ENOENT") {
                        throw error;
                    }
                
                }
            })
        );
    }

    async deleteFolder(folderPath: string) {
        try {
        
            await fs.promises.rm(folderPath, {
                recursive: true,
                force: true
            });
        
        } catch (error) {
        
            if (error.code !== "ENOENT") {
                throw error;
            }
        
        }
    }
}


