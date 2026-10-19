/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base del backend Go. Vacía: mock local. Ejemplo: http://localhost:8080 */
  readonly VITE_API_BASE_URL?: string;
}
