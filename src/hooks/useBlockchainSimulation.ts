import { useCallback, useEffect, useRef, useState } from "react";
import { fetchChainSnapshot, requestNextBlock } from "../services/blockchainApi.ts";
import { POA_NETWORK } from "../services/consensus.ts";
import type { Block, ChainConfig, ChainSnapshot } from "../types/blockchain.ts";

export type SimulationStatus = "loading" | "paused" | "running" | "error";

export function useBlockchainSimulation() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [config, setConfig] = useState<ChainConfig | null>(null);
  const [status, setStatus] = useState<SimulationStatus>("loading");
  const [intervalMs, setIntervalMsState] = useState(2000);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  const blocksRef = useRef<Block[]>([]);
  const configRef = useRef<ChainConfig | null>(null);
  const intervalRef = useRef(intervalMs);
  const runId = useRef(0);

  const publish = useCallback((snapshot: ChainSnapshot) => {
    blocksRef.current = snapshot.blocks;
    configRef.current = POA_NETWORK;
    setBlocks(snapshot.blocks);
    setConfig(POA_NETWORK);
    setEpoch((value) => value + 1);
    setError(null);
    setStatus("paused");
  }, []);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : "No se pudo cargar la cadena");
    setStatus("error");
  }, []);

  useEffect(() => {
    intervalRef.current = intervalMs;
  }, [intervalMs]);

  useEffect(() => {
    const id = ++runId.current;

    fetchChainSnapshot()
      .then((snapshot) => {
        if (id !== runId.current) return;
        publish(snapshot);
      })
      .catch((err: unknown) => {
        if (id !== runId.current) return;
        fail(err);
      });

    return () => {
      runId.current += 1;
    };
  }, [fail, publish]);

  useEffect(() => {
    if (status !== "running") return;

    const epochId = runId.current;
    let active = true;
    let timer: number | undefined;
    let releaseWait = () => {};

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
        releaseWait = resolve;
      });

    const tick = async () => {
      const previous = blocksRef.current.at(-1);
      const currentConfig = configRef.current;
      if (!previous || !currentConfig) return;

      const cycleStart = performance.now();

      try {
        const next = await requestNextBlock(previous, currentConfig);
        if (!active || epochId !== runId.current) return;

        while (active && epochId === runId.current) {
          const remaining = intervalRef.current - (performance.now() - cycleStart);
          if (remaining <= 0) break;
          await wait(Math.min(80, remaining));
        }

        if (!active || epochId !== runId.current) return;
        const updated = [...blocksRef.current, next];
        blocksRef.current = updated;
        setBlocks(updated);
      } catch (err) {
        if (!active || epochId !== runId.current) return;
        setError(err instanceof Error ? err.message : "No se pudo minar el bloque");
        setStatus("paused");
        return;
      }

      if (!active || epochId !== runId.current) return;
      void tick();
    };

    void tick();

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      releaseWait();
    };
  }, [status]);

  const play = useCallback(() => {
    if (blocksRef.current.length === 0 || !configRef.current) return;
    setError(null);
    setStatus((current) => (current === "paused" ? "running" : current));
  }, []);

  const pause = useCallback(() => {
    setStatus((current) => (current === "running" ? "paused" : current));
  }, []);

  const reset = useCallback(async () => {
    const id = ++runId.current;
    setStatus("loading");
    setError(null);

    try {
      const snapshot = await fetchChainSnapshot();
      if (id !== runId.current) return;
      publish(snapshot);
    } catch (err) {
      if (id !== runId.current) return;
      fail(err);
    }
  }, [fail, publish]);

  const setIntervalMs = useCallback((milliseconds: number) => {
    intervalRef.current = milliseconds;
    setIntervalMsState(milliseconds);
  }, []);

  return {
    blocks,
    config,
    status,
    intervalMs,
    setIntervalMs,
    error,
    epoch,
    play,
    pause,
    reset,
  };
}
