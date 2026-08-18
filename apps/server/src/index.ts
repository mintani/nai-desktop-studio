import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { env } from "@nai-desktop-studio/env/server";
import { assetsRouter } from "./assets";
import { collectionsRouter } from "./collections";
import { imagesRouter } from "./library";
import { novelaiRouter } from "./novelai";
import { settingsRouter } from "./settings";
import { tagsRouter } from "./tags";

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      // Expose the Content-Disposition we set on image binary responses so
      // the browser can read it.
      exposeHeaders: ["Content-Disposition"],
    })
  )
  .use(settingsRouter)
  .use(novelaiRouter)
  .use(imagesRouter)
  .use(tagsRouter)
  .use(collectionsRouter)
  .use(assetsRouter)
  .get("/", () => "OK")
  .listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });

export type App = typeof app;
