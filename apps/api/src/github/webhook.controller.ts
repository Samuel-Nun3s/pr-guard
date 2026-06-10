import { Controller, Post, Headers, Body, RawBodyRequest, Req, HttpCode, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { WebhookValidator } from './webhook.validator';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly validator: WebhookValidator,
    private readonly config: ConfigService,
  ) {}

  @Post('github')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Body() payload: unknown,
  ) {
    const secret = this.config.getOrThrow<string>('GITHUB_WEBHOOK_SECRET');
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(payload));

    if (!this.validator.validate(rawBody, signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Phase 1: enqueue job
    return { ok: true };
  }
}
