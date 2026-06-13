import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-auth.dto';
import { JwtAuthGuard } from './guard/jwtAuthGuard';
import { ReLoginDto } from './dto/relogin-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.login(loginDto, res);
  }

  @Post('/relogin')
  reLogin(
    @Body() reLoginDto: ReLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response 
  ) {
    return this.authService.reLogin(reLoginDto, req, res)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.logout(res);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  me(
    @Req() req: Request
  ) {
    return this.authService.me(req);
  }
}
