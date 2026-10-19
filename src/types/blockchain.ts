export interface Header {
  prev: string;
  miner: string;
  height: number;
  nonce: number;
}

export interface Signature {
  signer: string;
  satoshiId: number;
}

export interface Block {
  header: Header;
  signatures: Signature[];
  hash: string;
  verified: boolean;
  generation?: number;
}

export interface Validator {
  id: string;
  name: string;
  satoshiFrom: number;
  satoshiTo: number;
}

export interface ChainConfig {
  totalSupply: number;
  difficulty: number;
  validators: Validator[];
}

/** Respuesta de `GET /api/v1/chain` y de los POST `/api/v1/control/*`. */
export interface ChainSnapshot {
  blocks: Block[];
  supply?: number;
  difficulty?: number;
  intervalMs?: number;
  status?: "paused" | "running";
  generation?: number;
  height?: number;
  maxBlocks?: number;
  blockCount?: number;
  limitReached?: boolean;
  stopReason?: string;
}

/** Evento `status` de `GET /api/v1/stream`. */
export interface ChainStatus {
  status: "paused" | "running";
  generation: number;
  height: number;
  supply: number;
  difficulty: number;
  intervalMs: number;
  maxBlocks: number;
  blockCount: number;
  limitReached: boolean;
  stopReason: string;
}

/** Evento `block` de `GET /api/v1/stream`. */
export type StreamedBlock = Block;

/** Cuerpo de `POST /api/v1/blocks`. `height` es la altura del bloque anterior. */
export interface MineRequest {
  prev: string;
  height: number;
}
