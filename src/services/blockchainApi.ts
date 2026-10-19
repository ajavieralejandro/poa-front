import rawChain from "../data/mockChain.json" with { type: "json" };
import { readAppConfig } from "../config/env.ts";
import { mineBlock } from "./consensus.ts";
import type { Block, ChainConfig, ChainSnapshot } from "../types/blockchain.ts";

const NETWORK_LATENCY_MS = 160;

/**
 * Contrato con el backend Go:
 *   GET  {base}/api/v1/chain
 *   GET  {base}/api/v1/stream          evento `block` y evento `status`
 *   POST {base}/api/v1/control/start
 *   POST {base}/api/v1/control/pause
 *   POST {base}/api/v1/control/reset
 *
 * Sin `VITE_API_BASE_URL` se usa el JSON local. Un error de API no mina en el cliente.
 */
function apiBase(): string {
  return readAppConfig().apiBaseUrl;
}

export function chainDataSource(): "mock" | "api" {
  return readAppConfig().dataSource;
}

export function blockStreamURL(): string | null {
  const base = apiBase();
  if (!base) return null;
  return `${base}/api/v1/stream`;
}

export class ControlError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ControlError";
    this.status = status;
    this.code = code;
  }
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

  const response = await fetch(`${base}/api/v1/chain`);
  if (!response.ok) throw new Error("El backend no devolvió la cadena");
  const snapshot = (await response.json()) as ChainSnapshot;
  if (!Array.isArray(snapshot.blocks)) throw new Error("El backend no devolvió la cadena");
  return snapshot;
}

export async function postControl(action: "start" | "pause" | "reset"): Promise<ChainSnapshot> {
  const base = apiBase();
  if (!base) throw new ControlError("No hay backend configurado", 0);

  const response = await fetch(`${base}/api/v1/control/${action}`, { method: "POST" });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }

  if (response.status === 409) {
    const code =
      body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "block_limit_reached";
    throw new ControlError("Límite de la demo alcanzado. Reiniciá para comenzar otra ejecución.", 409, code);
  }
  if (!response.ok || !body || typeof body !== "object" || !Array.isArray((body as ChainSnapshot).blocks)) {
    throw new ControlError("El backend no pudo aplicar el control", response.status);
  }
  return body as ChainSnapshot;
}

export async function requestNextBlock(previous: Block, config: ChainConfig): Promise<Block> {
  const base = apiBase();
  if (base) {
    throw new ControlError("El minado de la demo lo hace el backend", 0);
  }

  await wait(NETWORK_LATENCY_MS);
  return mineBlock(previous, config);
}
