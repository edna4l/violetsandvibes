import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];

  // Only import the visualizer in development
  if (mode === "development") {
    const { visualizer } = await import("rollup-plugin-visualizer");
    plugins.push(visualizer({ open: true }));
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: ["src/main.tsx"],
      },
    },
  };
});

