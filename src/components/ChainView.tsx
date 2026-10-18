import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Block } from "../types/blockchain.ts";
import { formatNumber } from "../utils/format.ts";
import { BlockCard } from "./BlockCard.tsx";

interface ChainViewProps {
  blocks: Block[];
  mining: boolean;
  loading: boolean;
  intervalMs: number;
  error: string | null;
}

const cardShadow = "0 10px 24px rgba(42, 37, 30, 0.08), 0 2px 6px rgba(42, 37, 30, 0.05)";

export function ChainView({ blocks, mining, loading, intervalMs, error }: ChainViewProps) {
  const reduce = useReducedMotion() ?? false;
  const tipRef = useRef<HTMLDivElement>(null);
  const tip = blocks.at(-1);

  useEffect(() => {
    if (loading) return;
    tipRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [blocks.length, mining, loading, reduce]);

  return (
    <section aria-label="Cadena de bloques">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl leading-none text-ink">Cadena</h2>
        <p className="font-mono text-xs text-mute tabular-nums">{formatNumber(blocks.length)}</p>
      </header>

      {loading ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-[148px] w-[220px] animate-pulse rounded-md border border-line bg-ivory" />
          ))}
        </div>
      ) : error && blocks.length === 0 ? (
        <p className="text-sm text-[#8a4b3c]">{error}</p>
      ) : (
        <div className="flex flex-wrap gap-4" style={{ perspective: "1200px" }}>
          {blocks.map((block, index) => {
            const isTip = !mining && index === blocks.length - 1;
            return (
              <div key={block.hash} ref={isTip ? tipRef : undefined}>
                <BlockCard block={block} isLatest={isTip} enter={index === blocks.length - 1} />
              </div>
            );
          })}
          {mining && (
            <div ref={tipRef}>
              <MiningCard
                key={tip?.header.height ?? "origen"}
                intervalMs={intervalMs}
                nextHeight={(tip?.header.height ?? 0) + 1}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MiningCard({ intervalMs, nextHeight }: { intervalMs: number; nextHeight: number }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
      aria-label={`Minando bloque ${nextHeight}`}
      style={{ boxShadow: cardShadow }}
      className="relative flex w-[220px] flex-col rounded-md border border-gold/40 bg-ivory px-3 py-3"
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gold/50" aria-hidden="true" />
      <p className="font-serif text-[1.65rem] leading-none text-mute tabular-nums">
        #{String(nextHeight).padStart(2, "0")}
      </p>
      <div className="mt-4 h-px overflow-hidden bg-line">
        {reduce ? (
          <div className="h-full w-1/2 bg-gold/70" />
        ) : (
          <motion.div
            className="h-full origin-left bg-gold"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: Math.max(intervalMs, 400) / 1000, ease: "linear" }}
          />
        )}
      </div>
      <div className="mt-4 grid grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} className="mx-auto size-8 rounded-full border border-line" />
        ))}
      </div>
    </motion.div>
  );
}
