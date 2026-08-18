import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * SPA only. The app talks to the local Elysia server on another port and is
 * meant to end up inside a Tauri WebView, so there is nothing for a render
 * server to do — server rendering would only be weight to ship and a second
 * process to keep alive. The server build that happens here is used once, to
 * prerender the shell, and is not part of what runs.
 */
export default defineConfig({
  server: { port: 3001 },
  // `@/*` and `@nai-desktop-studio/ui/*` are declared once, in tsconfig.json.
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    // The shell is written as index.html rather than the default _shell.html:
    // it is the only document the app has, and every static host — Tauri's
    // WebView included — looks for that name.
    tanstackStart({
      spa: { enabled: true, prerender: { outputPath: "/index" } },
    }),
    // React's plugin has to come after Start's.
    viteReact(),
    // Carried over from the Next config, which had reactCompiler on. It
    // memoizes automatically, so the components stay free of useMemo noise.
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
