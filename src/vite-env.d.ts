/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

declare const __BUILD_COMMIT__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
