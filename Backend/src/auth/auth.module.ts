import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuarioModule } from 'src/usuario/usuario.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JWT_SECRET } from './jwt.config';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    forwardRef(() => UsuarioModule),
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '60m' }
    })
  ],
  exports: [JwtModule]
})
export class AuthModule {}
