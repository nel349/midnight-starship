// Shim for crypto.timingSafeEqual — not provided by crypto-browserify
// Uses constant-time comparison to prevent timing attacks

export function timingSafeEqual(a: Uint8Array | Buffer, b: Uint8Array | Buffer): boolean {
  if (a.length !== b.length) {
    throw new RangeError('Input buffers must have the same byte length');
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
