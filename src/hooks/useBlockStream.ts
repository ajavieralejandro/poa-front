import { useEffect, useRef } from "react";
import { blockStreamURL } from "../services/blockchainApi.ts";
import { openBlockStream, type BlockStreamHandlers } from "../services/blockStream.ts";

/** Se suscribe al stream mientras `enabled` es verdadero y vuelca cada bloque al callback. */
export function useBlockStream(enabled: boolean, handlers: BlockStreamHandlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const url = blockStreamURL();
    if (!url) return;

    let alive = true;
    const stop = openBlockStream(url, {
      onBlock: (block) => {
        if (!alive) return;
        handlersRef.current.onBlock(block);
      },
      onOpen: () => {
        if (!alive) return;
        handlersRef.current.onOpen?.();
      },
      onError: () => {
        if (!alive) return;
        handlersRef.current.onError?.();
      },
    });

    return () => {
      alive = false;
      stop();
    };
  }, [enabled]);
}
