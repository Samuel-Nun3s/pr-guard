import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const token = this.auth.login(body.email, body.password);
    if (!token) throw new UnauthorizedException('Invalid credentials');
    return { token };
  }
}
