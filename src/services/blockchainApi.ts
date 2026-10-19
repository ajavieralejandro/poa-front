import rawChain from "../data/mockChain.json" with { type: "json" };
import { mineBlock } from "./consensus.ts";
import type { Block, ChainConfig, ChainSnapshot, MineRequest } from "../types/blockchain.ts";

const NETWORK_LATENCY_MS = 160;

/**
 * Contrato con el backend Go:
 *   GET  {VITE_API_BASE_URL}/v1/chain   -> { blocks: Block[] }
 *   POST {VITE_API_BASE_URL}/v1/blocks  -> Block
 *        body: { prev, height }
 *
 * Block = { header: { prev, miner, height, nonce }, signatures: { signer, satoshiId }[], hash, verified }
 * Sin `VITE_API_BASE_URL` se usa el JSON local y el minado simulado.
 */
function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
  return configured.replace(/\/$/, "");
}

export function chainDataSource(): "mock" | "api" {
  return apiBase() ? "api" : "mock";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readMockSnapshot(): ChainSnapshot {
  return structuredClone(rawChain) as unknown as ChainSnapshot;
}

export async function fetchChainSnapshot(): Promise<ChainSnapshot> {
  const base = apiBase();
  if (!base) {
    await wait(NETWORK_LATENCY_MS);
    return readMockSnapshot();
  }

  const response = await fetch(`${base}/v1/chain`);
  if (!response.ok) throw new Error("El backend no devolvió la cadena");
  return (await response.json()) as ChainSnapshot;
}

export async function requestNextBlock(previous: Block, config: ChainConfig): Promise<Block> {
  const base = apiBase();
  if (!base) {
    await wait(NETWORK_LATENCY_MS);
    return mineBlock(previous, config);
  }

  const body: MineRequest = {
    prev: previous.hash,
    height: previous.header.height,
  };
  const response = await fetch(`${base}/v1/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("El backend no pudo minar el bloque");
  return (await response.json()) as Block;
}
