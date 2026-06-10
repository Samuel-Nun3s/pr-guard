import { CostCalculator, ModelPricing } from '../cost.calculator';
import { TokenUsage } from '../llm-provider.interface';

const pricing: ModelPricing = {
  inputPerMTok: 5.00,
  outputPerMTok: 25.00,
  cacheReadPerMTok: 0.50,
  cacheWritePerMTok: 6.25,
};

describe('CostCalculator', () => {
  const calc = new CostCalculator();

  it('returns 0 when all tokens are 0', () => {
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
    expect(calc.calculate(usage, pricing)).toBe(0);
  });

  it('computes input-only cost correctly', () => {
    // 1M input tokens × $5.00/MTok = $5.00 = 500 cents
    const usage: TokenUsage = { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
    expect(calc.calculate(usage, pricing)).toBe(500);
  });

  it('computes output-only cost correctly', () => {
    // 1M output × $25.00/MTok = $25.00 = 2500 cents
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0, cacheCreationTokens: 0 };
    expect(calc.calculate(usage, pricing)).toBe(2500);
  });

  it('includes cache read and write costs', () => {
    // 1M cache read × $0.50 = $0.50 = 50 cents
    // 1M cache write × $6.25 = $6.25 = 625 cents
    // total = 675 cents
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000, cacheCreationTokens: 1_000_000 };
    expect(calc.calculate(usage, pricing)).toBe(675);
  });

  it('sums all token types', () => {
    const usage: TokenUsage = {
      inputTokens: 1_000,      // 1k × $5/MTok   = $0.005
      outputTokens: 1_000,     // 1k × $25/MTok  = $0.025
      cacheReadTokens: 1_000,  // 1k × $0.5/MTok = $0.0005
      cacheCreationTokens: 0,
    };
    // total = $0.0305 → 3 cents (rounded)
    expect(calc.calculate(usage, pricing)).toBe(3);
  });

  it('rounds to nearest cent', () => {
    // 100 input tokens × $5/MTok = $0.0005 → 0 cents (rounds down)
    const usage: TokenUsage = { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
    expect(calc.calculate(usage, pricing)).toBe(0);
  });
});
