import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class WebhookValidator {
  validate(payload: Buffer, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
