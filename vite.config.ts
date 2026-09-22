import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const commit = env.VITE_BUILD_SHA || env.RENDER_GIT_COMMIT || "local";

  return {
    plugins: [
      react(),
      {
        name: "merchant-build-info",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "build-info.json",
            source: JSON.stringify({ commit }),
          });
        },
      },
    ],
    server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
  };
});
