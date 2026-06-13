import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor (
        private readonly jwtService: JwtService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        const token = request.cookies['access_token'];

        if (!token) throw new UnauthorizedException("No estas autorizado");

        try {
            const user = this.jwtService.verify(token);
            request.user = user;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Token inválido o expirado');
        }
    }
    
}