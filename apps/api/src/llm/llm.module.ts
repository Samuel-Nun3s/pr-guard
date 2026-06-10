import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { CostCalculator } from './cost.calculator';

@Module({
  providers: [CryptoService, CostCalculator],
  exports: [CryptoService, CostCalculator],
})
export class LlmModule {}
