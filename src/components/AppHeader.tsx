import type { SimulationStatus } from "../hooks/useBlockchainSimulation.ts";
import { formatNumber } from "../utils/format.ts";
import { MarkIcon } from "./icons.tsx";

interface AppHeaderProps {
  status: SimulationStatus;
  height: number;
  source: "mock" | "api";
}

const statusCopy: Record<SimulationStatus, string> = {
  loading: "Sincronizando",
  running: "En curso",
  paused: "En pausa",
  error: "Error",
};

export function AppHeader({ status, height, source }: AppHeaderProps) {
  const live = status === "running";

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-md border border-line text-gold">
          <MarkIcon className="size-7" />
        </span>
        <div>
          <p className="text-[11px] tracking-[0.18em] text-mute uppercase">Proof of Activity</p>
          <h1 className="font-serif text-3xl leading-none text-ink sm:text-4xl">Follow the Satoshi</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-line bg-ivory px-2.5 py-1 text-[11px] text-mute">
          {source === "api" ? "Backend" : "Mock local"}
        </span>
        <span
          className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] ${
            live
              ? "border-olive/40 bg-ivory text-olive"
              : status === "error"
                ? "border-[#e2c8c0] bg-ivory text-[#8a4b3c]"
                : "border-line bg-ivory text-mute"
          }`}
        >
          <span className={`size-1.5 rounded-full ${live ? "bg-olive" : "bg-current"}`} />
          {statusCopy[status]}
        </span>
        <span className="rounded-md border border-line bg-ivory px-2.5 py-1 font-mono text-[11px] text-gold tabular-nums">
          altura {formatNumber(height)}
        </span>
      </div>
    </header>
  );
}
