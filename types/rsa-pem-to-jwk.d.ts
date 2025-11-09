// types/rsa-pem-to-jwk.d.ts
declare module 'rsa-pem-to-jwk' {
  interface Jwk {
    kty: string;
    use: string;
    n: string;
    e: string;
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    kid?: string;
    alg?: string;
  }

  function rsaPemToJwk(
    pem: string | Buffer,
    options: { use: string },
    keyType: 'public' | 'private',
  ): Jwk;

  export = rsaPemToJwk;
}
