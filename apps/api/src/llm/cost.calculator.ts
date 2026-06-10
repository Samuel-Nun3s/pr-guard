import { Injectable } from '@nestjs/common';
import { TokenUsage } from './llm-provider.interface';

export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
}

@Injectable()
export class CostCalculator {
  /** Returns cost in cents (integer) */
  calculate(usage: TokenUsage, pricing: ModelPricing): number {
    const toMTok = (n: number) => n / 1_000_000;

    const cost =
      toMTok(usage.inputTokens) * pricing.inputPerMTok +
      toMTok(usage.outputTokens) * pricing.outputPerMTok +
      toMTok(usage.cacheReadTokens) * pricing.cacheReadPerMTok +
      toMTok(usage.cacheCreationTokens) * pricing.cacheWritePerMTok;

    return Math.round(cost * 100);
  }
}
