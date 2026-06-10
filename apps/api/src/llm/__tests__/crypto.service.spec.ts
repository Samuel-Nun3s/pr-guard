import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../crypto.service';

// 32-byte key as 64 hex chars
const ENCRYPTION_KEY = 'a'.repeat(64);

function makeService() {
  const config = { getOrThrow: (key: string) => key === 'ENCRYPTION_KEY' ? ENCRYPTION_KEY : '' } as unknown as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  it('round-trips a plaintext API key', () => {
    const svc = makeService();
    const original = 'sk-ant-api03-supersecret';
    expect(svc.decrypt(svc.encrypt(original))).toBe(original);
  });

  it('produces different ciphertexts for the same input (random IV)', () => {
    const svc = makeService();
    const a = svc.encrypt('same-key');
    const b = svc.encrypt('same-key');
    expect(a).not.toBe(b);
  });

  it('throws when decrypting tampered ciphertext', () => {
    const svc = makeService();
    const ct = svc.encrypt('secret');
    const tampered = Buffer.from(ct, 'base64');
    tampered[tampered.length - 1] ^= 0xff;
    expect(() => svc.decrypt(tampered.toString('base64'))).toThrow();
  });

  it('throws when key is not 32 bytes', () => {
    const badConfig = { getOrThrow: () => 'tooshort' } as unknown as ConfigService;
    expect(() => new CryptoService(badConfig)).toThrow('ENCRYPTION_KEY must be 32 bytes');
  });
});
