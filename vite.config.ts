import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";

const backendUrl = "http://telegrok-env.eba-mpmkzqcb.ap-south-1.elasticbeanstalk.com";

export default defineConfig({
  vite: {
    plugins: [basicSsl()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          headers: {
            Origin: backendUrl,
          },
        },
        "/ws": {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
          headers: {
            Origin: backendUrl,
          },
        },
      },
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ["**/dist/**", "**/.git/**"],
      },
    },
  },
});