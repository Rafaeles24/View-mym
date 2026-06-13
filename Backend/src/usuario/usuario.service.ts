import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsuarioService {
  constructor (
    private readonly prisma: PrismaService,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const usuario = await this.findOnebyUsername(createUsuarioDto.username);

    if (usuario) throw new BadRequestException(`Ya existe un usuario con el username ingresado.`);

    return await this.prisma.usuario.create({
      data: {
        nombre: createUsuarioDto.nombre,
        username: createUsuarioDto.username,
        password: createUsuarioDto.password
      }
    });
  }

  async findOnebyUsername(username: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username }
    });

    return usuario;
  }

  findAll() {
    return `This action returns all usuario`;
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id }
    });

    return usuario;
  }

  update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    return `This action updates a #${id} usuario`;
  }

  remove(id: number) {
    return `This action removes a #${id} usuario`;
  }
}
