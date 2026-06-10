import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Model pricing seed (user-editable via Settings)
  const pricingData = [
    { provider: 'anthropic', model: 'claude-opus-4-8',   inputPerMTok: 5.00, outputPerMTok: 25.00, cacheReadPerMTok: 0.50, cacheWritePerMTok: 6.25 },
    { provider: 'anthropic', model: 'claude-sonnet-4-6', inputPerMTok: 3.00, outputPerMTok: 15.00, cacheReadPerMTok: 0.30, cacheWritePerMTok: 3.75 },
    { provider: 'anthropic', model: 'claude-haiku-4-5',  inputPerMTok: 1.00, outputPerMTok: 5.00,  cacheReadPerMTok: 0.10, cacheWritePerMTok: 1.25 },
  ];

  for (const p of pricingData) {
    await prisma.modelPricing.upsert({
      where: { provider_model: { provider: p.provider, model: p.model } },
      update: p,
      create: p,
    });
  }

  // Knowledge packs seed
  const packs = [
    { slug: 'clean-code',            title: 'Clean Code',            description: 'Princípios de Robert C. Martin sobre legibilidade e manutenibilidade', filePath: 'knowledge/packs/clean-code.md' },
    { slug: 'refactoring',           title: 'Refactoring',           description: 'Técnicas de Fowler para melhorar código existente sem mudar comportamento', filePath: 'knowledge/packs/refactoring.md' },
    { slug: 'pragmatic-programmer',  title: 'The Pragmatic Programmer', description: 'Boas práticas e mentalidade de Hunt & Thomas', filePath: 'knowledge/packs/pragmatic-programmer.md' },
    { slug: 'design-patterns',       title: 'Design Patterns',       description: 'Padrões GoF — quando aplicar e quando evitar', filePath: 'knowledge/packs/design-patterns.md' },
  ];

  for (const pack of packs) {
    await prisma.knowledgePack.upsert({
      where: { slug: pack.slug },
      update: pack,
      create: pack,
    });
  }

  console.log('Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
