import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private email!: string;
  private password!: string;
  private jwtSecret!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.email     = this.config.getOrThrow<string>('AUTH_EMAIL');
    this.password  = this.config.getOrThrow<string>('AUTH_PASSWORD');
    this.jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');
    this.logger.log(`Auth configured for ${this.email}`);
  }

  login(email: string, password: string): string | null {
    const emailOk    = this.timingSafeEqual(email,    this.email);
    const passwordOk = this.timingSafeEqual(password, this.password);
    if (!emailOk || !passwordOk) return null;
    return jwt.sign({ sub: email }, this.jwtSecret, { expiresIn: '7d' });
  }

  verify(token: string): boolean {
    try {
      jwt.verify(token, this.jwtSecret);
      return true;
    } catch {
      return false;
    }
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still run the comparison to avoid timing leaks on length
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
