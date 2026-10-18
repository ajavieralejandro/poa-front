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

/** Respuesta de `GET /api/v1/chain`. */
export interface ChainSnapshot {
  blocks: Block[];
}

/** Cuerpo de `POST /api/v1/blocks`. `height` es la altura del bloque anterior. */
export interface MineRequest {
  prev: string;
  height: number;
}
