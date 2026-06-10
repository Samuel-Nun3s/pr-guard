import { createHmac } from 'crypto';
import { WebhookValidator } from '../webhook.validator';

describe('WebhookValidator', () => {
  const validator = new WebhookValidator();
  const secret = 'test-secret';

  function makeSignature(payload: string) {
    const hmac = createHmac('sha256', secret);
    return 'sha256=' + hmac.update(payload).digest('hex');
  }

  it('accepts a valid signature', () => {
    const payload = Buffer.from('{"action":"opened"}');
    const sig = makeSignature(payload.toString());
    expect(validator.validate(payload, sig, secret)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const payload = Buffer.from('{"action":"opened"}');
    const sig = makeSignature('{"action":"malicious"}');
    expect(validator.validate(payload, sig, secret)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const payload = Buffer.from('{"action":"opened"}');
    const sig = makeSignature(payload.toString());
    expect(validator.validate(payload, sig, 'wrong-secret')).toBe(false);
  });

  it('rejects a signature without sha256= prefix', () => {
    const payload = Buffer.from('{"action":"opened"}');
    const hmac = createHmac('sha256', secret);
    const sigWithoutPrefix = hmac.update(payload).digest('hex');
    expect(validator.validate(payload, sigWithoutPrefix, secret)).toBe(false);
  });

  it('rejects an empty signature', () => {
    const payload = Buffer.from('{"action":"opened"}');
    expect(validator.validate(payload, '', secret)).toBe(false);
  });
});
