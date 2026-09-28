import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const commit = env.VITE_BUILD_SHA || env.RENDER_GIT_COMMIT || "local";
  // Em desenvolvimento, a API fica na mesma origem do site, como no rewrite do Render.
  // Sem isso o cookie de sessão seria de terceiros e o navegador o bloquearia.
  const apiTarget = env.VITE_API_PROXY_TARGET || "https://fastapi-merchant-app.onrender.com";
  const proxy = {
    "/api": { target: apiTarget, changeOrigin: true },
    "/health": { target: apiTarget, changeOrigin: true },
  };

  return {
    // O mesmo SHA de build-info.json, disponível no código para os eventos de uso.
    define: { __BUILD_COMMIT__: JSON.stringify(commit) },
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
    server: { host: "0.0.0.0", allowedHosts: ["terminal.local"], proxy },
    preview: { proxy },
  };
});
