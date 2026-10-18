import { AppHeader } from "./components/AppHeader.tsx";
import { ChainView } from "./components/ChainView.tsx";
import { SimulationControls } from "./components/SimulationControls.tsx";
import { useBlockchainSimulation } from "./hooks/useBlockchainSimulation.ts";
import { chainDataSource } from "./services/blockchainApi.ts";

export default function App() {
  const simulation = useBlockchainSimulation();
  const source = chainDataSource();
  const height = simulation.blocks.at(-1)?.header.height ?? 0;
  const live =
    simulation.status === "running"
      ? `Simulación en curso. Altura ${height}.`
      : `Simulación en pausa. Altura ${height}.`;

  return (
    <div className="min-h-screen bg-parchment text-ink antialiased">
      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <p className="sr-only" aria-live="polite">
          {simulation.status === "loading" ? "Sincronizando la cadena." : live}
        </p>
        <AppHeader status={simulation.status} height={height} source={source} />
        <div className="grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <SimulationControls
            status={simulation.status}
            intervalMs={simulation.intervalMs}
            onIntervalChange={simulation.setIntervalMs}
            onPlay={simulation.play}
            onPause={simulation.pause}
            onReset={() => void simulation.reset()}
            config={simulation.config}
            height={height}
            error={simulation.error}
          />
          <ChainView
            key={simulation.epoch}
            blocks={simulation.blocks}
            mining={simulation.status === "running"}
            loading={simulation.status === "loading"}
            intervalMs={simulation.intervalMs}
            error={simulation.error}
          />
        </div>
      </main>
    </div>
  );
}
