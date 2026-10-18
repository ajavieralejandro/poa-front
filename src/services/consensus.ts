import type { Block, ChainConfig, Signature } from "../types/blockchain.ts";

export const ZERO_HASH = "0".repeat(64);

/** Parámetros locales del suministro. El bloque en sí sigue el contrato de la API. */
export const POA_NETWORK: ChainConfig = {
  totalSupply: 1000,
  difficulty: 4,
  validators: [
    { id: "aurora", name: "Aurora", satoshiFrom: 1, satoshiTo: 220 },
    { id: "borealis", name: "Borealis", satoshiFrom: 221, satoshiTo: 420 },
    { id: "cipher", name: "Cipher", satoshiFrom: 421, satoshiTo: 600 },
    { id: "dune", name: "Dune", satoshiFrom: 601, satoshiTo: 760 },
    { id: "ember", name: "Ember", satoshiFrom: 761, satoshiTo: 900 },
    { id: "flux", name: "Flux", satoshiFrom: 901, satoshiTo: 1000 },
  ],
};

function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

export function hashHex(input: string): string {
  let a = 0x6a09e667;
  let b = 0xbb67ae85;
  let c = 0x3c6ef372;
  let d = 0xa54ff53a;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    a = (Math.imul(a ^ code, 0x9e3779b1) + b) >>> 0;
    b = (Math.imul(b ^ rotl(code, 8), 0x85ebca77) + c) >>> 0;
    c = (Math.imul(c ^ rotl(code, 16), 0xc2b2ae3d) + d) >>> 0;
    d = (Math.imul(d ^ rotl(code, 24), 0x27d4eb2f) + a) >>> 0;
  }

  let hex = "";
  for (let round = 0; round < 8; round += 1) {
    a = (Math.imul(a ^ (a >>> 16), 0x7feb352d) + round) >>> 0;
    b = (Math.imul(b ^ (b >>> 15), 0x846ca68b) ^ a) >>> 0;
    c = (Math.imul(c ^ (c >>> 13), 0x9e3779b1) + b) >>> 0;
    d = (Math.imul(d ^ (d >>> 17), 0x27d4eb2f) ^ c) >>> 0;
    hex += d.toString(16).padStart(8, "0");
  }

  return hex;
}

export function findNonce(material: string, difficulty: number): { nonce: number; hash: string } {
  const target = "0".repeat(difficulty);
  for (let nonce = 0; nonce <= 1_500_000; nonce += 1) {
    const hash = hashHex(`${material}:${nonce}`);
    if (hash.startsWith(target)) return { nonce, hash };
  }
  throw new Error(`No hubo nonce con ${difficulty} ceros iniciales`);
}

function satoshiFromSeed(seed: string, supply: number): number {
  const sample = Number.parseInt(hashHex(seed).slice(0, 8), 16);
  return (sample % supply) + 1;
}

function ownerOf(satoshiId: number, config: ChainConfig) {
  return config.validators.find(
    (validator) => satoshiId >= validator.satoshiFrom && satoshiId <= validator.satoshiTo,
  );
}

/** Tres firmas de autoridades distintas, una por satoshi sorteado. */
export function drawSignatures(seed: string, config: ChainConfig, count = 3): Signature[] {
  const signatures: Signature[] = [];
  const usedSatoshi = new Set<number>();
  const usedValidators = new Set<string>();
  let salt = 0;

  while (signatures.length < count && salt < 400) {
    const satoshiId = satoshiFromSeed(`${seed}:${salt}`, config.totalSupply);
    salt += 1;
    if (usedSatoshi.has(satoshiId)) continue;

    const validator = ownerOf(satoshiId, config);
    if (!validator || usedValidators.has(validator.id)) continue;

    usedSatoshi.add(satoshiId);
    usedValidators.add(validator.id);
    signatures.push({ signer: validator.name, satoshiId });
  }

  if (signatures.length < count) {
    throw new Error("No se pudo completar el sorteo Follow the Satoshi");
  }

  return signatures;
}

function blockMaterial(height: number, prev: string, miner: string, signatures: Signature[]): string {
  const committee = signatures.map((signature) => signature.satoshiId).join(",");
  return [height, prev, miner, committee].join("|");
}

function seal(height: number, prev: string, signatures: Signature[], config: ChainConfig): Block {
  const miner = signatures[0]?.signer ?? "";
  const { nonce, hash } = findNonce(blockMaterial(height, prev, miner, signatures), config.difficulty);

  return {
    header: { prev, miner, height, nonce },
    signatures,
    hash,
    verified: true,
  };
}

export function mineGenesis(config: ChainConfig): Block {
  const signatures = drawSignatures(`genesis|${config.totalSupply}`, config);
  return seal(0, ZERO_HASH, signatures, config);
}

export function mineBlock(previous: Block, config: ChainConfig): Block {
  const height = previous.header.height + 1;
  const signatures = drawSignatures(`${previous.hash}:${height}`, config);
  return seal(height, previous.hash, signatures, config);
}
