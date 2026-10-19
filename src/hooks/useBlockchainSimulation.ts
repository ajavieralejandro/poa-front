import { useCallback, useEffect, useRef, useState } from "react";
import { readAppConfig } from "../config/env.ts";
import { ControlError, fetchChainSnapshot, postControl, requestNextBlock } from "../services/blockchainApi.ts";
import { POA_NETWORK } from "../services/consensus.ts";
import type { Block, ChainConfig, ChainSnapshot, ChainStatus } from "../types/blockchain.ts";
import { useBlockStream } from "./useBlockStream.ts";

export type SimulationStatus = "loading" | "paused" | "running" | "error";
export type PendingControl = "start" | "pause" | "reset" | null;

const LIMIT_MESSAGE = "Límite de la demo alcanzado. Reiniciá para comenzar otra ejecución.";

export interface DemoMeta {
  generation: number;
  blockCount: number;
  maxBlocks: number | null;
  limitReached: boolean;
  stopReason: string;
}

function configFrom(snapshot: ChainSnapshot): ChainConfig {
  return {
    ...POA_NETWORK,
    totalSupply: snapshot.supply ?? POA_NETWORK.totalSupply,
    difficulty: snapshot.difficulty ?? POA_NETWORK.difficulty,
  };
}

function metaFrom(snapshot: ChainSnapshot, blocks: Block[]): DemoMeta {
  return {
    generation: snapshot.generation ?? 0,
    blockCount: snapshot.blockCount ?? blocks.length,
    maxBlocks: snapshot.maxBlocks ?? null,
    limitReached: snapshot.limitReached === true,
    stopReason: snapshot.stopReason ?? "",
  };
}

export function useBlockchainSimulation() {
  const dataSource = readAppConfig().dataSource;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [config, setConfig] = useState<ChainConfig | null>(null);
  const [status, setStatus] = useState<SimulationStatus>("loading");
  const [intervalMs, setIntervalMsState] = useState(2000);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [pending, setPending] = useState<PendingControl>(null);
  const [meta, setMeta] = useState<DemoMeta>({
    generation: 0,
    blockCount: 0,
    maxBlocks: null,
    limitReached: false,
    stopReason: "",
  });

  const blocksRef = useRef<Block[]>([]);
  const configRef = useRef<ChainConfig | null>(null);
  const intervalRef = useRef(intervalMs);
  const generationRef = useRef(0);
  const runId = useRef(0);
  const opId = useRef(0);
  const resyncing = useRef(false);

  const applySnapshot = useCallback((snapshot: ChainSnapshot) => {
    const api = readAppConfig().dataSource === "api";
    const gen = snapshot.generation ?? 0;
    if (api) {
      if (gen < generationRef.current) return;
      if (gen === generationRef.current && snapshot.blocks.length < blocksRef.current.length) return;
      generationRef.current = gen;
    }

    const nextConfig = configFrom(snapshot);
    const replaced =
      blocksRef.current.length === 0 ||
      snapshot.blocks.length < blocksRef.current.length ||
      snapshot.blocks[0]?.hash !== blocksRef.current[0]?.hash;
    blocksRef.current = snapshot.blocks;
    configRef.current = nextConfig;
    setBlocks(snapshot.blocks);
    setConfig(nextConfig);
    if (replaced) setEpoch((value) => value + 1);
    setError(null);
    if (api) {
      setMeta(metaFrom(snapshot, snapshot.blocks));
      if (typeof snapshot.intervalMs === "number") {
        intervalRef.current = snapshot.intervalMs;
        setIntervalMsState(snapshot.intervalMs);
      }
      setStatus(snapshot.status === "running" ? "running" : "paused");
      return;
    }
    setStatus("paused");
  }, []);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : "No se pudo cargar la cadena");
    setStatus("error");
  }, []);

  const resync = useCallback(() => {
    if (resyncing.current) return;
    resyncing.current = true;
    fetchChainSnapshot()
      .then((snapshot) => {
        applySnapshot(snapshot);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudo sincronizar la cadena");
      })
      .finally(() => {
        resyncing.current = false;
      });
  }, [applySnapshot]);

  useEffect(() => {
    intervalRef.current = intervalMs;
  }, [intervalMs]);

  useEffect(() => {
    const id = ++runId.current;

    fetchChainSnapshot()
      .then((snapshot) => {
        if (id !== runId.current) return;
        applySnapshot(snapshot);
      })
      .catch((err: unknown) => {
        if (id !== runId.current) return;
        fail(err);
      });

    return () => {
      runId.current += 1;
    };
  }, [applySnapshot, fail]);

  useBlockStream(dataSource === "api", {
    onBlock: (block) => {
      if (block.generation !== undefined && block.generation < generationRef.current) return;
      if (block.generation !== undefined && block.generation > generationRef.current) {
        resync();
        return;
      }

      const current = blocksRef.current;
      if (current.some((item) => item.hash === block.hash)) return;

      const tip = current.at(-1);
      if (tip && (block.header.prev !== tip.hash || block.header.height <= tip.header.height)) {
        resync();
        return;
      }

      const updated = [...current, block];
      blocksRef.current = updated;
      setBlocks(updated);
      setMeta((currentMeta) => ({ ...currentMeta, blockCount: updated.length }));
      setError(null);
    },
    onStatus: (next: ChainStatus) => {
      if (next.generation < generationRef.current) return;
      if (next.generation > generationRef.current || next.blockCount > blocksRef.current.length) {
        resync();
        return;
      }
      if (next.blockCount < blocksRef.current.length) return;
      generationRef.current = next.generation;
      setStatus(next.status === "running" ? "running" : "paused");
      setMeta({
        generation: next.generation,
        blockCount: next.blockCount,
        maxBlocks: next.maxBlocks,
        limitReached: next.limitReached,
        stopReason: next.stopReason,
      });
      intervalRef.current = next.intervalMs;
      setIntervalMsState(next.intervalMs);
      if (next.supply) {
        setConfig((current) =>
          current
            ? { ...current, totalSupply: next.supply, difficulty: next.difficulty }
            : current,
        );
      }
    },
    onOpen: () => {
      setError((current) => (current?.includes("stream") ? null : current));
      resync();
    },
    onError: () => {
      setError((current) => current ?? "Se interrumpió el stream de bloques. Reintentando…");
    },
  });

  useEffect(() => {
    if (dataSource === "api" || status !== "running") return;

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
  }, [dataSource, status]);

  const runControl = useCallback(
    async (action: Exclude<PendingControl, null>) => {
      const id = ++opId.current;
      setPending(action);
      setError(null);
      try {
        const snapshot = await postControl(action);
        if (id !== opId.current) return;
        applySnapshot(snapshot);
      } catch (err) {
        if (id !== opId.current) return;
        if (err instanceof ControlError && err.code === "block_limit_reached") {
          setStatus("paused");
          setMeta((current) => ({ ...current, limitReached: true, stopReason: "block_limit" }));
        }
        setError(err instanceof Error ? err.message : "No se pudo aplicar el control");
      } finally {
        if (id === opId.current) setPending(null);
      }
    },
    [applySnapshot],
  );

  const play = useCallback(() => {
    if (blocksRef.current.length === 0 || !configRef.current) return;
    if (dataSource === "api") {
      void runControl("start");
      return;
    }
    setError(null);
    setStatus((current) => (current === "paused" ? "running" : current));
  }, [dataSource, runControl]);

  const pause = useCallback(() => {
    if (dataSource === "api") {
      void runControl("pause");
      return;
    }
    setStatus((current) => (current === "running" ? "paused" : current));
  }, [dataSource, runControl]);

  const reset = useCallback(async () => {
    if (dataSource === "api") {
      const accepted = window.confirm(
        "Se reinicia la demo compartida. La cadena actual se descarta y el minado vuelve a empezar desde el génesis.",
      );
      if (!accepted) return;
      await runControl("reset");
      return;
    }

    const id = ++runId.current;
    setStatus("loading");
    setError(null);
    try {
      const snapshot = await fetchChainSnapshot();
      if (id !== runId.current) return;
      applySnapshot(snapshot);
    } catch (err) {
      if (id !== runId.current) return;
      fail(err);
    }
  }, [applySnapshot, dataSource, fail, runControl]);

  const setIntervalMs = useCallback((milliseconds: number) => {
    if (readAppConfig().dataSource === "api") return;
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
    pending,
    meta,
    play,
    pause,
    reset,
  };
}
