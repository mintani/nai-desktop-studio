import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

// Self-hosted rather than fetched from Google: this runs on localhost and is
// headed for a Tauri window, so a font the app cannot reach offline is a font
// that sometimes is not there.
//
// Latin subsets only. Poppins has no Japanese glyphs — the Japanese stack in
// globals.css covers that — so its devanagari and latin-ext subsets would be
// several hundred KB nothing ever renders.
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-400-italic.css";
import "@fontsource-variable/jetbrains-mono/wght.css";

import { Providers } from "@/components/providers";
import appCss from "@/index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "nai-desktop-studio" },
      {
        name: "description",
        content: "Generate images with NovelAI and review them locally.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Scripts />
      </body>
    </html>
  );
}
