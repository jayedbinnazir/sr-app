import { generateKeyPairSync } from 'node:crypto';
import * as fs from 'node:fs';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048, // 2048 is sufficient for JWK
  publicKeyEncoding: {
    type: 'pkcs1', // ✅ Use PKCS#1 for public key
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs1', // ✅ Use PKCS#1 for private key (not pkcs8)
    format: 'pem',
    // ❌ REMOVE cipher and passphrase for unencrypted key
  },
});

console.log({
  publicKey,
  privateKey,
});

fs.mkdirSync('certs');

fs.writeFileSync('certs/private.pem', privateKey);
fs.writeFileSync('certs/public.pem', publicKey);
