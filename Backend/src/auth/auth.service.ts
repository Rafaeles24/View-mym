import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsuarioService } from 'src/usuario/usuario.service';
import { LoginDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ReLoginDto } from './dto/relogin-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto, res: any) {
    try {
      const usuario = await this.usuarioService.findOnebyUsername(loginDto.username);

      if (!usuario) throw new NotFoundException(`No se encontro un usuario.`);

      const pass = await bcrypt.compare(loginDto.password, usuario.password);

      if (!pass) {
        throw new UnauthorizedException(`Las credenciales no coinciden.`);
      }

      const accessToken = this.jwtService.sign(
        { usuario_id: usuario.id },
        { expiresIn: "1h" }
      );

      const refreshToken = this.jwtService.sign(
        { usuario_id: usuario.id },
        { expiresIn: "7d" }
      )

      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: "/",
        maxAge: 60 * 60 * 1000
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
      })

      return { message: `Login OK` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(`Ocurrio un error inesperado en el servicio de login: ${error}`)
    }
  } 

  async reLogin(reLoginDto: ReLoginDto, req: any, res: any) {
    try {
      const refreshToken = req.cookies["refresh_token"];
      if (!refreshToken) throw new UnauthorizedException("No session detect.");

      const payload = this.jwtService.verify(refreshToken);

      const verify = await this.usuarioService.findOne(payload.usuario_id);
      if (!verify) throw new NotFoundException("Usuario no encontrado");

      const pass = await bcrypt.compare(reLoginDto.password, verify.password);

      if (!pass) {
        throw new UnauthorizedException(`Las credenciales no coinciden.`);
      }
      
      const newAccessToken = this.jwtService.sign({
        usuario_id: verify.id
      });

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: "/",
        maxAge: 1 * 60 * 1000
      });

      return { message: `ReLogin OK` };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(`Ocurrio un error inesperado en el servicio de relogin: ${error}`)
    }
  }

  async logout(res: any) {
    try {
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });

      return {
        success: "Logout exitoso"
      };
    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error en el servicio de logout: ${error}`);
    }
  }

  //servicio para verificar la sesion de usuario.
  async me(req: any) {
    try {
      const verify = await this.usuarioService.findOne(req.user.usuario_id);
      if (!verify) throw new BadRequestException("Usuario no encontrado");
      return {
        id: verify.id,
        nombre: verify.nombre,
        username: verify.username,
        createdAt: verify.createdAt
      }; 
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Ocurrio un error en el servicio de obtener usuario: ${error}`);
    }
  }
}
