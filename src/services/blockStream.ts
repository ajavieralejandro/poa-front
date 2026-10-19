import type { Block, ChainStatus } from "../types/blockchain.ts";

export interface BlockStreamHandlers {
  onBlock: (block: Block) => void;
  onStatus?: (status: ChainStatus) => void;
  onOpen?: () => void;
  onError?: () => void;
}

function isStatus(value: unknown): value is ChainStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Partial<ChainStatus>;
  return (
    (status.status === "paused" || status.status === "running") &&
    typeof status.generation === "number" &&
    typeof status.blockCount === "number" &&
    typeof status.maxBlocks === "number" &&
    typeof status.limitReached === "boolean"
  );
}

function isBlock(value: unknown): value is Block {
  if (!value || typeof value !== "object") return false;
  const block = value as Partial<Block>;
  return (
    typeof block.hash === "string" &&
    typeof block.header?.height === "number" &&
    typeof block.header.prev === "string" &&
    Array.isArray(block.signatures)
  );
}

/**
 * Abre el stream SSE del backend. EventSource reintenta solo si la conexión se cae.
 * La función devuelta cierra el canal.
 */
export function openBlockStream(url: string, handlers: BlockStreamHandlers): () => void {
  const source = new EventSource(url);

  const onBlock = (event: Event) => {
    try {
      const parsed: unknown = JSON.parse((event as MessageEvent<string>).data);
      if (!isBlock(parsed)) return;
      handlers.onBlock(parsed);
    } catch {
      handlers.onError?.();
    }
  };

  const onStatus = (event: Event) => {
    try {
      const parsed: unknown = JSON.parse((event as MessageEvent<string>).data);
      if (!isStatus(parsed)) return;
      handlers.onStatus?.(parsed);
    } catch {
      handlers.onError?.();
    }
  };

  source.addEventListener("block", onBlock);
  source.addEventListener("status", onStatus);
  source.onopen = () => {
    handlers.onOpen?.();
  };
  source.onerror = () => {
    handlers.onError?.();
  };

  return () => {
    source.removeEventListener("block", onBlock);
    source.removeEventListener("status", onStatus);
    source.close();
  };
}
