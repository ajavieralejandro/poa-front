import type { DemoMeta, PendingControl, SimulationStatus } from "../hooks/useBlockchainSimulation.ts";
import type { ChainConfig } from "../types/blockchain.ts";
import { formatNumber, formatSeconds } from "../utils/format.ts";
import { PauseIcon, PlayIcon, ResetIcon } from "./icons.tsx";

const LIMIT_MESSAGE = "Límite de la demo alcanzado. Reiniciá para comenzar otra ejecución.";

interface SimulationControlsProps {
  status: SimulationStatus;
  intervalMs: number;
  onIntervalChange: (milliseconds: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  config: ChainConfig | null;
  height: number;
  error: string | null;
  pending: PendingControl;
  meta: DemoMeta;
}

export function SimulationControls({
  status,
  intervalMs,
  onIntervalChange,
  onPlay,
  onPause,
  onReset,
  config,
  height,
  error,
  pending,
  meta,
}: SimulationControlsProps) {
  const running = status === "running";
  const busy = pending !== null || status === "loading";
  const supply = config?.totalSupply ?? 1000;
  const difficulty = config?.difficulty;
  const shared = meta.maxBlocks !== null;
  const blockCount = meta.blockCount;

  return (
    <aside className="rounded-md border border-line bg-ivory px-4 py-4 shadow-[0_10px_24px_rgba(42,37,30,0.06)]">
      <h2 className="font-serif text-3xl leading-none text-ink">Simulación</h2>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={onPlay}
          disabled={busy || status !== "paused" || meta.limitReached}
          aria-pressed={running}
          aria-busy={pending === "start"}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-olive px-3 py-2.5 text-sm text-parchment transition hover:bg-moss focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlayIcon className="size-4" />
          {pending === "start" ? "Iniciando…" : "Iniciar simulación"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPause}
            disabled={busy || !running}
            aria-busy={pending === "pause"}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/40 px-3 py-2 text-sm text-gold transition hover:bg-gold/10 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PauseIcon className="size-4" />
            {pending === "pause" ? "Pausando…" : "Pausar"}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            aria-busy={pending === "reset"}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-ink transition hover:border-gold/40 focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ResetIcon className="size-4" />
            {pending === "reset" ? "Reiniciando…" : "Reiniciar"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <label htmlFor="mine-interval" className="text-xs tracking-[0.12em] text-mute uppercase">
            Intervalo
          </label>
          <span className="font-mono text-xs text-gold tabular-nums">{formatSeconds(intervalMs)}</span>
        </div>
        <input
          id="mine-interval"
          type="range"
          min={500}
          max={5000}
          step={100}
          value={intervalMs}
          disabled={busy || shared}
          onChange={(event) => onIntervalChange(Number(event.target.value))}
          className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-gold disabled:cursor-not-allowed"
        />
      </div>

      <dl className="mt-6 space-y-3 border-t border-line pt-5">
        {shared ? (
          <Metric label="Supply" value={`${formatNumber(supply)} satoshis`} />
        ) : (
          <Metric label="Supply" value={formatNumber(supply)} />
        )}
        {shared && meta.maxBlocks !== null && (
          <>
            <Metric label="Máximo" value={`${formatNumber(meta.maxBlocks)} bloques`} />
            <Metric label="Bloques" value={`${formatNumber(blockCount ?? 0)} / ${formatNumber(meta.maxBlocks)}`} />
          </>
        )}
        <Metric label="Dificultad" value={difficulty === undefined ? "—" : String(difficulty)} />
        <Metric label="Altura" value={config ? formatNumber(height) : "—"} />
      </dl>

      {meta.limitReached && (
        <p role="status" className="mt-4 text-xs text-[#8a4b3c]">
          {LIMIT_MESSAGE}
        </p>
      )}
      {error && status !== "loading" && error !== LIMIT_MESSAGE && (
        <p role="alert" className="mt-4 text-xs text-[#8a4b3c]">
          {error}
        </p>
      )}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs tracking-[0.12em] text-mute uppercase">{label}</dt>
      <dd className="font-serif text-3xl leading-none text-ink tabular-nums">{value}</dd>
    </div>
  );
}
