import type { Block } from "../types/blockchain.ts";

export interface BlockStreamHandlers {
  onBlock: (block: Block) => void;
  onOpen?: () => void;
  onError?: () => void;
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

  source.addEventListener("block", onBlock);
  source.onopen = () => {
    handlers.onOpen?.();
  };
  source.onerror = () => {
    handlers.onError?.();
  };

  return () => {
    source.removeEventListener("block", onBlock);
    source.close();
  };
}
