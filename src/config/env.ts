export type DataSource = "mock" | "api";

export interface AppConfig {
  apiBaseUrl: string;
  dataSource: DataSource;
}

/** Lee la configuración que Vite inyecta en tiempo de build. */
export function readAppConfig(): AppConfig {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");
  return {
    apiBaseUrl,
    dataSource: apiBaseUrl.length > 0 ? "api" : "mock",
  };
}
