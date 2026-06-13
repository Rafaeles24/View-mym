import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuarioModule } from 'src/usuario/usuario.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    forwardRef(() => UsuarioModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "la_clave_ultra_mega_archi_secreta",
      signOptions: { expiresIn: '60m' }
    })
  ],
  exports: [JwtModule]
})
export class AuthModule {}
