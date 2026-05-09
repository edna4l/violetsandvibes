import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Only import the visualizer in development
let visualizer;
if (process.env.NODE_ENV === "development") {
  visualizer = require("rollup-plugin-visualizer").visualizer;
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    ...(visualizer ? [visualizer({ open: true })] : []), // only add if in dev
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // increase chunk size warning limit
    rollupOptions: {
      external: ['src/main.tsx'],
    },
  },
}));

