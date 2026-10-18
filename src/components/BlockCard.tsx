import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Block, Signature } from "../types/blockchain.ts";
import { formatSatoshi, truncateHash } from "../utils/format.ts";
import { CheckIcon, CopyIcon } from "./icons.tsx";

interface BlockCardProps {
  block: Block;
  isLatest: boolean;
  enter: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;
const cardShadow = "0 10px 24px rgba(42, 37, 30, 0.08), 0 2px 6px rgba(42, 37, 30, 0.05)";

export function BlockCard({ block, isLatest, enter }: BlockCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const shouldEnter = enter && !reduce;

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(block.hash);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.article
      aria-label={`Bloque ${block.header.height}`}
      initial={shouldEnter ? { opacity: 0, y: -22 } : false}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { scale: 1.02, rotateX: 3, rotateY: -3, zIndex: 10 }}
      transition={{ duration: reduce ? 0 : 0.45, ease }}
      style={{ transformStyle: "preserve-3d", boxShadow: cardShadow }}
      className={`relative w-[220px] rounded-md border bg-ivory px-3 py-3 ${
        isLatest ? "border-gold/70" : "border-line"
      }`}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gold/80" aria-hidden="true" />

      <header className="flex items-center justify-between">
        <p className="font-serif text-[1.65rem] leading-none text-ink tabular-nums">
          #{String(block.header.height).padStart(2, "0")}
        </p>
        {block.verified ? (
          <CheckIcon className="size-4 text-olive" />
        ) : (
          <span className="size-1.5 rounded-full bg-mute" aria-label="Pendiente" />
        )}
      </header>

      <div className="mt-3 flex items-center gap-1.5">
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink" title={block.hash}>
          {truncateHash(block.hash, 6, 4)}
        </p>
        <button
          type="button"
          onClick={() => void copyHash()}
          aria-label={copied ? "Hash copiado" : "Copiar hash"}
          className="grid size-6 shrink-0 place-items-center rounded-full text-mute transition hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
        >
          {copied ? <CheckIcon className="size-3.5 text-olive" /> : <CopyIcon className="size-3.5" />}
        </button>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-1">
        {block.signatures.map((signature) => (
          <Medal key={`${signature.signer}-${signature.satoshiId}`} signature={signature} />
        ))}
      </ul>
    </motion.article>
  );
}

function Medal({ signature }: { signature: Signature }) {
  return (
    <li className="flex min-w-0 flex-col items-center gap-1">
      <span className="grid size-8 place-items-center rounded-full border border-gold/70 bg-parchment font-serif text-[11px] text-gold">
        {signature.signer.slice(0, 2)}
      </span>
      <span className="w-full truncate text-center text-[10px] leading-none text-ink">{signature.signer}</span>
      <span className="font-mono text-[9px] leading-none text-gold">{formatSatoshi(signature.satoshiId)}</span>
    </li>
  );
}
