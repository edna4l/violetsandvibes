import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Set the limit in KiB (e.g., 1000 KiB = 1 MB)
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: ['src/main.tsx']
    }
  },
}));
