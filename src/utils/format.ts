import type { Validator } from "../types/blockchain.ts";

export function truncateHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function formatSatoshi(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatSeconds(milliseconds: number): string {
  return `${new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(milliseconds / 1000)} s`;
}

export function stakePercent(validator: Validator, supply: number): number {
  if (supply <= 0) return 0;
  return ((validator.satoshiTo - validator.satoshiFrom + 1) / supply) * 100;
}
