import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "@nai-desktop-studio/env/server";
import { assetsRouter } from "./assets";
import { collectionsRouter } from "./collections";
import { imagesRouter } from "./library";
import { novelaiRouter } from "./novelai";
import { referencesRouter } from "./references";
import { settingsRouter } from "./settings";
import { tagsRouter } from "./tags";

const app = new Hono()
  .use(
    "*",
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      // Expose the Content-Disposition we set on image binary responses so
      // the browser can read it.
      exposeHeaders: ["Content-Disposition"],
    })
  )
  .route("/settings", settingsRouter)
  .route("/novelai", novelaiRouter)
  .route("/images", imagesRouter)
  .route("/tags", tagsRouter)
  .route("/collections", collectionsRouter)
  .route("/assets", assetsRouter)
  .route("/references", referencesRouter)
  .get("/", (c) => c.text("OK"));

// Served here rather than by exporting a default, so the line below is printed
// once the port is actually bound and can name the port that was taken. The
// desktop shell waits on that port before it opens a window.
const server = Bun.serve({ port: env.PORT, fetch: app.fetch });

console.log(`Server is running on http://localhost:${server.port}`);

export type App = typeof app;
